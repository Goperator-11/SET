import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { join, resolve, extname, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import {
  hashPassword, verifyPassword, countUsers, findUser, findUserById, createUser,
  changePassword, createSession, getSessionUser, deleteSession, purgeExpiredSessions,
  getProgress, saveProgress, leaderboard
} from "./db.js";

const PORT = Number(process.env.PORT || 3000);
const PUBLIC_DIR = resolve(fileURLToPath(new URL("../public", import.meta.url)));
const INVITE_CODE = process.env.INVITE_CODE || "";
const COOKIE_SECURE = process.env.COOKIE_SECURE === "true";
const COOKIE = "ns_session";
const MAX_BODY = 512 * 1024;          // 진도 JSON 상한
const MAX_STATE = 400 * 1024;

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".png": "image/png",
  ".woff2": "font/woff2",
  ".txt": "text/plain; charset=utf-8",
  ".webmanifest": "application/manifest+json"
};

/* ---------- 로그인 시도 제한 ---------- */
const attempts = new Map();           // key -> {n, until}
const LOCK_AFTER = 8, LOCK_MS = 10 * 60 * 1000;
function throttled(key) {
  const a = attempts.get(key);
  if (a && a.until > Date.now()) return Math.ceil((a.until - Date.now()) / 1000);
  return 0;
}
function noteFail(key) {
  const a = attempts.get(key) || { n: 0, until: 0 };
  a.n++;
  if (a.n >= LOCK_AFTER) { a.until = Date.now() + LOCK_MS; a.n = 0; }
  attempts.set(key, a);
}
const clearFail = (key) => attempts.delete(key);

/* ---------- 도우미 ---------- */
const send = (res, code, body, headers = {}) => {
  res.writeHead(code, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
    ...headers
  });
  res.end(body === undefined ? "" : JSON.stringify(body));
};
const fail = (res, code, message) => send(res, code, { error: message });

function readCookie(req, name) {
  const raw = req.headers.cookie;
  if (!raw) return null;
  for (const part of raw.split(";")) {
    const i = part.indexOf("=");
    if (i < 0) continue;
    if (part.slice(0, i).trim() === name) return decodeURIComponent(part.slice(i + 1).trim());
  }
  return null;
}

function setCookie(res, token, maxAgeSec) {
  const bits = [
    `${COOKIE}=${encodeURIComponent(token)}`,
    "Path=/", "HttpOnly", "SameSite=Strict",
    `Max-Age=${maxAgeSec}`
  ];
  if (COOKIE_SECURE) bits.push("Secure");
  res.setHeader("Set-Cookie", bits.join("; "));
}

function readBody(req) {
  return new Promise((ok, no) => {
    let size = 0;
    const chunks = [];
    req.on("data", c => {
      size += c.length;
      if (size > MAX_BODY) { no(new Error("too large")); req.destroy(); return; }
      chunks.push(c);
    });
    req.on("end", () => {
      if (!chunks.length) return ok({});
      try { ok(JSON.parse(Buffer.concat(chunks).toString("utf8"))); }
      catch { no(new Error("bad json")); }
    });
    req.on("error", no);
  });
}

const clientKey = req =>
  (req.headers["x-forwarded-for"]?.split(",")[0] || req.socket.remoteAddress || "?").trim();

const USERNAME_RE = /^[A-Za-z0-9._-]{3,24}$/;
function validCredentials(u, p) {
  if (typeof u !== "string" || !USERNAME_RE.test(u))
    return "아이디는 영문·숫자·. _ - 조합 3~24자여야 합니다.";
  if (typeof p !== "string" || p.length < 8)
    return "비밀번호는 8자 이상이어야 합니다.";
  if (p.length > 200) return "비밀번호가 너무 깁니다.";
  return null;
}

const publicUser = u => ({ username: u.username, isOwner: !!u.is_owner });

/* ---------- API ---------- */
async function api(req, res, path) {
  const user = getSessionUser(readCookie(req, COOKIE));

  if (path === "/api/config" && req.method === "GET") {
    return send(res, 200, {
      server: true,
      registerOpen: countUsers() === 0 || !!INVITE_CODE,
      needsInvite: countUsers() > 0 && !!INVITE_CODE,
      firstRun: countUsers() === 0
    });
  }

  if (path === "/api/me" && req.method === "GET") {
    if (!user) return fail(res, 401, "로그인이 필요합니다.");
    return send(res, 200, { user: publicUser(user) });
  }

  if (path === "/api/register" && req.method === "POST") {
    const body = await readBody(req);
    const username = String(body.username || "").trim();
    const bad = validCredentials(username, body.password);
    if (bad) return fail(res, 400, bad);

    const first = countUsers() === 0;
    if (!first) {
      if (!INVITE_CODE) return fail(res, 403, "지금은 새 가입을 받지 않습니다.");
      if (String(body.invite || "") !== INVITE_CODE) return fail(res, 403, "초대코드가 올바르지 않습니다.");
    }
    if (findUser(username)) return fail(res, 409, "이미 있는 아이디입니다.");

    const id = createUser(username, await hashPassword(body.password), first);
    const token = createSession(id);
    setCookie(res, token, 60 * 864e2);
    return send(res, 200, { user: publicUser(findUserById(id)) });
  }

  if (path === "/api/login" && req.method === "POST") {
    const key = clientKey(req);
    const wait = throttled(key);
    if (wait) return fail(res, 429, `시도가 너무 많습니다. ${wait}초 뒤에 다시 해주세요.`);

    const body = await readBody(req);
    const username = String(body.username || "").trim();
    const row = findUser(username);
    const ok = row && await verifyPassword(String(body.password || ""), row.pw_hash);
    if (!ok) { noteFail(key); return fail(res, 401, "아이디 또는 비밀번호가 올바르지 않습니다."); }

    clearFail(key);
    setCookie(res, createSession(row.id), 60 * 864e2);
    return send(res, 200, { user: publicUser(row) });
  }

  if (path === "/api/logout" && req.method === "POST") {
    const t = readCookie(req, COOKIE);
    if (t) deleteSession(t);
    setCookie(res, "", 0);
    return send(res, 200, { ok: true });
  }

  if (path === "/api/password" && req.method === "POST") {
    if (!user) return fail(res, 401, "로그인이 필요합니다.");
    const body = await readBody(req);
    if (!await verifyPassword(String(body.current || ""), user.pw_hash))
      return fail(res, 401, "현재 비밀번호가 올바르지 않습니다.");
    if (typeof body.next !== "string" || body.next.length < 8)
      return fail(res, 400, "새 비밀번호는 8자 이상이어야 합니다.");
    changePassword(user.id, await hashPassword(body.next));
    setCookie(res, createSession(user.id), 60 * 864e2);
    return send(res, 200, { ok: true });
  }

  if (path === "/api/progress") {
    if (!user) return fail(res, 401, "로그인이 필요합니다.");
    if (req.method === "GET") {
      const { data, updated_at } = getProgress(user.id);
      return send(res, 200, { state: data, updatedAt: updated_at });
    }
    if (req.method === "PUT") {
      const body = await readBody(req);
      const state = body.state;
      if (!state || typeof state !== "object" || Array.isArray(state))
        return fail(res, 400, "진도 형식이 올바르지 않습니다.");
      if (JSON.stringify(state).length > MAX_STATE)
        return fail(res, 413, "진도 데이터가 너무 큽니다.");
      return send(res, 200, { updatedAt: saveProgress(user.id, state) });
    }
  }

  if (path === "/api/ranking" && req.method === "GET") {
    if (!user) return fail(res, 401, "로그인이 필요합니다.");
    return send(res, 200, {
      me: user.username,
      rows: leaderboard().map(r => ({
        username: r.username, xp: r.xp || 0, solved: r.solved || 0,
        streak: r.streak || 0, updatedAt: r.updated_at || 0
      }))
    });
  }

  return fail(res, 404, "없는 API입니다.");
}

/* ---------- 정적 파일 ---------- */
async function serveStatic(req, res, path) {
  let rel = decodeURIComponent(path);
  if (rel.endsWith("/")) rel += "index.html";
  if (!extname(rel)) rel += ".html";

  const target = resolve(join(PUBLIC_DIR, normalize(rel)));
  if (target !== PUBLIC_DIR && !target.startsWith(PUBLIC_DIR + (process.platform === "win32" ? "\\" : "/")))
    return fail(res, 403, "접근할 수 없습니다.");

  try {
    const info = await stat(target);
    if (!info.isFile()) throw new Error("not a file");
    const buf = await readFile(target);
    const ext = extname(target).toLowerCase();
    const immutable = ext === ".woff2";
    res.writeHead(200, {
      "Content-Type": MIME[ext] || "application/octet-stream",
      "Content-Length": buf.length,
      "Cache-Control": immutable ? "public, max-age=31536000, immutable"
        : ext === ".html" ? "no-cache" : "public, max-age=3600",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "same-origin"
    });
    res.end(req.method === "HEAD" ? undefined : buf);
  } catch {
    res.writeHead(404, { "Content-Type": "text/html; charset=utf-8" });
    res.end('<meta charset="utf-8"><p style="font:16px sans-serif;padding:40px">' +
      '페이지를 찾을 수 없습니다. <a href="/">문제집으로</a></p>');
  }
}

/* ---------- 라우팅 ---------- */
const server = createServer(async (req, res) => {
  const path = new URL(req.url, "http://x").pathname;
  try {
    if (path.startsWith("/api/")) {
      if (req.method !== "GET" && req.method !== "HEAD") {
        const origin = req.headers.origin;
        if (origin) {
          const host = req.headers["x-forwarded-host"] || req.headers.host;
          try {
            if (new URL(origin).host !== host) return fail(res, 403, "출처가 올바르지 않습니다.");
          } catch { return fail(res, 403, "출처가 올바르지 않습니다."); }
        }
      }
      return await api(req, res, path);
    }
    if (req.method !== "GET" && req.method !== "HEAD") return fail(res, 405, "허용되지 않는 방식입니다.");
    return await serveStatic(req, res, path);
  } catch (e) {
    const msg = String(e?.message || e);
    if (msg === "too large") return fail(res, 413, "요청이 너무 큽니다.");
    if (msg === "bad json") return fail(res, 400, "JSON 형식이 올바르지 않습니다.");
    console.error("[error]", e);
    if (!res.headersSent) fail(res, 500, "서버 오류가 발생했습니다.");
  }
});

purgeExpiredSessions();
setInterval(purgeExpiredSessions, 6 * 3600 * 1000).unref();

server.listen(PORT, () => {
  console.log(`야간근무 100일 — http://localhost:${PORT}`);
  if (countUsers() === 0) console.log("첫 실행입니다. 브라우저에서 계정을 만들면 그 계정이 주인이 됩니다.");
  else if (INVITE_CODE) console.log("초대코드로 추가 가입을 받는 중입니다.");
  else console.log("추가 가입은 닫혀 있습니다. INVITE_CODE를 설정하면 열립니다.");
});

for (const sig of ["SIGINT", "SIGTERM"]) {
  process.on(sig, () => { server.close(() => process.exit(0)); setTimeout(() => process.exit(0), 3000).unref(); });
}
