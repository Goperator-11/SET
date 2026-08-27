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
  updated_at INTEGER NOT NULL
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
  const solved = state?.done && typeof state.done === "object"
    ? Object.values(state.done).filter(d => d && d.celebrated).length : 0;
  const now = Date.now();
  db.prepare(
    `INSERT INTO progress (user_id, data, xp, solved, streak, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(user_id) DO UPDATE SET
       data = excluded.data, xp = excluded.xp, solved = excluded.solved,
       streak = excluded.streak, updated_at = excluded.updated_at`
  ).run(userId, JSON.stringify(state), xp, solved, streak, now);
  return now;
}

export const leaderboard = () =>
  db.prepare(
    `SELECT u.username, u.is_owner, p.xp, p.solved, p.streak, p.updated_at
     FROM users u LEFT JOIN progress p ON p.user_id = u.id
     ORDER BY COALESCE(p.xp, 0) DESC, COALESCE(p.solved, 0) DESC, u.created_at ASC
     LIMIT 100`
  ).all();
