import { DatabaseSync } from "node:sqlite";
import { randomBytes, scrypt as _scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { mkdirSync, existsSync } from "node:fs";
import { dirname } from "node:path";

const scrypt = promisify(_scrypt);

const DB_PATH = process.env.DB_PATH || "/data/nightshift.db";
const dir = dirname(DB_PATH);
if (dir && dir !== "." && !existsSync(dir)) mkdirSync(dir, { recursive: true });

export const db = new DatabaseSync(DB_PATH);

db.exec(`
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  username   TEXT    NOT NULL UNIQUE COLLATE NOCASE,
  pw_hash    TEXT    NOT NULL,
  is_owner   INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS progress (
  user_id    INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  data       TEXT    NOT NULL,
  xp         INTEGER NOT NULL DEFAULT 0,
  solved     INTEGER NOT NULL DEFAULT 0,
  streak     INTEGER NOT NULL DEFAULT 0,
  cos        TEXT    NOT NULL DEFAULT '{}',
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS teams (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT    NOT NULL UNIQUE COLLATE NOCASE,
  tag        TEXT    NOT NULL,
  intro      TEXT    NOT NULL DEFAULT '',
  owner_id   INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  token      TEXT    PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_exp  ON sessions(expires_at);
`);

/* ---------- 비밀번호 ---------- */
// scrypt + 무작위 salt. 저장 형식: scrypt$N$r$p$salt$hash (모두 base64url)
const N = 16384, R = 8, P = 1, KEYLEN = 64;

export async function hashPassword(pw) {
  const salt = randomBytes(16);
  const key = await scrypt(pw.normalize("NFKC"), salt, KEYLEN, { N, r: R, p: P, maxmem: 64 * 1024 * 1024 });
  return ["scrypt", N, R, P, salt.toString("base64url"), key.toString("base64url")].join("$");
}

export async function verifyPassword(pw, stored) {
  try {
    const [scheme, n, r, p, saltB64, hashB64] = String(stored).split("$");
    if (scheme !== "scrypt") return false;
    const salt = Buffer.from(saltB64, "base64url");
    const expected = Buffer.from(hashB64, "base64url");
    const key = await scrypt(pw.normalize("NFKC"), salt, expected.length,
      { N: +n, r: +r, p: +p, maxmem: 64 * 1024 * 1024 });
    return key.length === expected.length && timingSafeEqual(key, expected);
  } catch {
    return false;
  }
}

/* ---------- 사용자 ---------- */
export const countUsers = () => db.prepare("SELECT COUNT(*) AS c FROM users").get().c;
export const findUser = (username) =>
  db.prepare("SELECT * FROM users WHERE username = ?").get(username);
export const findUserById = (id) =>
  db.prepare("SELECT * FROM users WHERE id = ?").get(id);

export function createUser(username, pwHash, isOwner) {
  const now = Date.now();
  const info = db.prepare(
    "INSERT INTO users (username, pw_hash, is_owner, created_at) VALUES (?, ?, ?, ?)"
  ).run(username, pwHash, isOwner ? 1 : 0, now);
  const id = Number(info.lastInsertRowid);
  db.prepare("INSERT INTO progress (user_id, data, updated_at) VALUES (?, ?, ?)")
    .run(id, "{}", now);
  return id;
}

export function changePassword(userId, pwHash) {
  db.prepare("UPDATE users SET pw_hash = ? WHERE id = ?").run(pwHash, userId);
  // 비밀번호를 바꾸면 다른 기기의 세션을 전부 끊는다
  db.prepare("DELETE FROM sessions WHERE user_id = ?").run(userId);
}

/* 이미 만들어진 DB 에는 CREATE TABLE IF NOT EXISTS 가 새 컬럼을 넣어주지 않는다.
   없으면 붙이고, 있으면 조용히 넘어간다. */
for (const [table, col, def] of [
  ["progress", "cos", "TEXT NOT NULL DEFAULT '{}'"],
  ["users", "team_id", "INTEGER REFERENCES teams(id) ON DELETE SET NULL"],
]) {
  const has = db.prepare(`PRAGMA table_info(${table})`).all().some(c => c.name === col);
  if (!has) db.exec(`ALTER TABLE ${table} ADD COLUMN ${col} ${def}`);
}

/* ---------- 세션 ---------- */
const SESSION_DAYS = 60;

export function createSession(userId) {
  const token = randomBytes(32).toString("base64url");
  const now = Date.now();
  db.prepare("INSERT INTO sessions (token, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)")
    .run(token, userId, now, now + SESSION_DAYS * 864e5);
  return token;
}

export function getSessionUser(token) {
  if (!token) return null;
  const row = db.prepare(
    `SELECT u.* FROM sessions s JOIN users u ON u.id = s.user_id
     WHERE s.token = ? AND s.expires_at > ?`
  ).get(token, Date.now());
  return row || null;
}

export const deleteSession = (token) =>
  db.prepare("DELETE FROM sessions WHERE token = ?").run(token);

export const purgeExpiredSessions = () =>
  db.prepare("DELETE FROM sessions WHERE expires_at <= ?").run(Date.now());

/* ---------- 진도 ---------- */
export function getProgress(userId) {
  const row = db.prepare("SELECT data, updated_at FROM progress WHERE user_id = ?").get(userId);
  if (!row) return { data: null, updated_at: 0 };
  try {
    return { data: JSON.parse(row.data), updated_at: row.updated_at };
  } catch {
    return { data: null, updated_at: row.updated_at };
  }
}

export function saveProgress(userId, state) {
  const xp = Number.isFinite(state?.xp) ? Math.trunc(state.xp) : 0;
  const streak = Number.isFinite(state?.streak) ? Math.trunc(state.streak) : 0;
  // 해결 수는 두 트랙(방어+공격)을 합쳐 센다. 예전 형식(최상위 done)도 받아준다.
  const countDone = d => (d && typeof d === "object")
    ? Object.values(d).filter(x => x && x.celebrated).length : 0;
  const solved = state?.tracks && typeof state.tracks === "object"
    ? Object.values(state.tracks).reduce((n, t) => n + countDone(t && t.done), 0)
    : countDone(state?.done);
  const now = Date.now();
  // 랭킹에서 남의 닉네임을 치장까지 그리려면 이 두 값이 필요하다.
  // 진도 전체를 파싱하지 않아도 되게 따로 뽑아 둔다.
  const sh = state?.shop && typeof state.shop === "object" ? state.shop : {};
  const pick = v => (typeof v === "string" && v.length <= 32 ? v : null);
  const cos = JSON.stringify({ skin: pick(sh.skin), title: pick(sh.title) });
  db.prepare(
    `INSERT INTO progress (user_id, data, xp, solved, streak, cos, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(user_id) DO UPDATE SET
       data = excluded.data, xp = excluded.xp, solved = excluded.solved,
       streak = excluded.streak, cos = excluded.cos, updated_at = excluded.updated_at`
  ).run(userId, JSON.stringify(state), xp, solved, streak, cos, now);
  return now;
}

export const leaderboard = () =>
  db.prepare(
    `SELECT u.username, u.is_owner, t.tag AS team_tag, t.name AS team_name,
            p.xp, p.solved, p.streak, p.cos, p.updated_at
     FROM users u
     LEFT JOIN progress p ON p.user_id = u.id
     LEFT JOIN teams t    ON t.id = u.team_id
     ORDER BY COALESCE(p.xp, 0) DESC, COALESCE(p.solved, 0) DESC, u.created_at ASC
     LIMIT 100`
  ).all();


/* ---------- 팀 ---------- */
/* 팀 목록. 인원과 XP 합계를 함께 내서 팀 랭킹으로 바로 쓴다. */
export const teams = () =>
  db.prepare(
    `SELECT t.id, t.name, t.tag, t.intro, t.created_at,
            ou.username AS owner,
            COUNT(u.id)                  AS members,
            COALESCE(SUM(p.xp), 0)       AS xp,
            COALESCE(SUM(p.solved), 0)   AS solved
     FROM teams t
     LEFT JOIN users u    ON u.team_id = t.id
     LEFT JOIN progress p ON p.user_id = u.id
     LEFT JOIN users ou   ON ou.id = t.owner_id
     GROUP BY t.id
     ORDER BY xp DESC, members DESC, t.created_at ASC
     LIMIT 100`
  ).all();

export const findTeamByName = (name) =>
  db.prepare("SELECT * FROM teams WHERE name = ?").get(name);

export const findTeamById = (id) =>
  db.prepare("SELECT * FROM teams WHERE id = ?").get(id);

export function createTeam(name, tag, intro, ownerId) {
  const now = Date.now();
  const info = db.prepare(
    "INSERT INTO teams (name, tag, intro, owner_id, created_at) VALUES (?, ?, ?, ?, ?)"
  ).run(name, tag, intro, ownerId, now);
  const id = Number(info.lastInsertRowid);
  db.prepare("UPDATE users SET team_id = ? WHERE id = ?").run(id, ownerId);
  return id;
}

export const setUserTeam = (userId, teamId) =>
  db.prepare("UPDATE users SET team_id = ? WHERE id = ?").run(teamId, userId);

export const teamMembers = (teamId) =>
  db.prepare(
    `SELECT u.username, p.xp, p.solved, p.streak, p.cos, p.updated_at
     FROM users u LEFT JOIN progress p ON p.user_id = u.id
     WHERE u.team_id = ?
     ORDER BY COALESCE(p.xp, 0) DESC, u.created_at ASC
     LIMIT 200`
  ).all(teamId);

/* 팀이 비면 남겨둘 이유가 없다. 마지막 사람이 나가면 함께 지운다. */
export function pruneEmptyTeam(teamId) {
  if (!teamId) return;
  const n = db.prepare("SELECT COUNT(*) AS c FROM users WHERE team_id = ?").get(teamId).c;
  if (n === 0) db.prepare("DELETE FROM teams WHERE id = ?").run(teamId);
}

/* 팀장이 나가면 남은 사람 중 가장 오래된 사람에게 넘긴다. */
export function handOverTeam(teamId, leavingUserId) {
  const t = findTeamById(teamId);
  if (!t || t.owner_id !== leavingUserId) return;
  const next = db.prepare(
    "SELECT id FROM users WHERE team_id = ? AND id != ? ORDER BY created_at ASC LIMIT 1"
  ).get(teamId, leavingUserId);
  db.prepare("UPDATE teams SET owner_id = ? WHERE id = ?")
    .run(next ? next.id : null, teamId);
}

/* ---------- 프로필 ---------- */
/* 남이 봐도 되는 것만 담는다. 비밀번호 해시·세션은 당연히 제외하고,
   진도 원본(data)도 통째로는 내보내지 않는다. 배지는 목록만 꺼낸다. */
export function publicProfile(username) {
  const row = db.prepare(
    `SELECT u.username, u.created_at, u.is_owner,
            t.id AS team_id, t.name AS team_name, t.tag AS team_tag,
            p.xp, p.solved, p.streak, p.cos, p.data, p.updated_at
     FROM users u
     LEFT JOIN teams t    ON t.id = u.team_id
     LEFT JOIN progress p ON p.user_id = u.id
     WHERE u.username = ?`
  ).get(username);
  if (!row) return null;

  let badges = [], best = 0, first = 0, subs = 0, acts = {}, redSolved = 0;
  const actCount = (done, out) => {
    if (!done || typeof done !== "object") return 0;
    let n = 0;
    for (const k of Object.keys(done)) {
      if (!done[k] || !done[k].celebrated) continue;
      n++;
      if (out) { const a = Math.floor((Number(k) - 1) / 20); if (a >= 0 && a <= 7) out[a] = (out[a] || 0) + 1; }
    }
    return n;
  };
  try {
    const d = JSON.parse(row.data || "{}");
    badges = Array.isArray(d.badges) ? d.badges.slice(0, 64) : [];
    best   = Number.isFinite(d.best)  ? d.best  : 0;
    // 액트별 진행·정답률은 방어(blue) 트랙 기준으로 보여준다. 예전 형식은 최상위 done.
    const blue = d.tracks && d.tracks.blue ? d.tracks.blue : d;
    first  = Number.isFinite(blue.first) ? blue.first : (d.first || 0);
    subs   = Array.isArray(blue.subs) ? blue.subs.length : (Array.isArray(d.subs) ? d.subs.length : 0);
    actCount(blue.done, acts);
    if (d.tracks && d.tracks.red) redSolved = actCount(d.tracks.red.done, null);
  } catch { /* 진도가 깨져 있어도 프로필은 떠야 한다 */ }

  let cos = {};
  try { cos = JSON.parse(row.cos || "{}"); } catch { cos = {}; }

  return {
    username: row.username, isOwner: !!row.is_owner, joinedAt: row.created_at,
    team: row.team_id ? { id: row.team_id, name: row.team_name, tag: row.team_tag } : null,
    xp: row.xp || 0, solved: row.solved || 0, streak: row.streak || 0,
    best, first, subs, badges, acts, redSolved, cos, updatedAt: row.updated_at || 0
  };
}
