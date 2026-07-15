import type { AuthSession, AuthUser } from "@/types/auth";
import {
  isGoogleSheetSyncEnabled,
  postAppsScriptAuth,
} from "./googleSheetSync";

const USERS_KEY = "sumbi-auth-users";
const SESSION_KEY = "sumbi-session";

function normalizeUser(user: AuthUser): AuthUser {
  return {
    ...user,
    nickname: user.nickname ?? user.name,
  };
}

function loadUsers(): AuthUser[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = localStorage.getItem(USERS_KEY);
    if (!raw) {
      return [];
    }
    return (JSON.parse(raw) as AuthUser[]).map(normalizeUser);
  } catch {
    return [];
  }
}

function saveUsers(users: AuthUser[]): void {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

/** 원격 로그인/가입 성공 시 이 기기 localStorage에도 캐시 (오프라인·빠른 재로그인) */
function upsertLocalUser(user: AuthUser): void {
  const users = loadUsers();
  const index = users.findIndex((entry) => entry.email === user.email);
  if (index === -1) {
    saveUsers([...users, user]);
    return;
  }

  const next = [...users];
  next[index] = normalizeUser(user);
  saveUsers(next);
}

function createId(): string {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    try {
      return crypto.randomUUID();
    } catch {
      // http://LAN-IP 처럼 secure context가 아니면 실패할 수 있음
    }
  }

  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

function toUtf8Bytes(message: string): Uint8Array {
  return new TextEncoder().encode(message);
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

/** SubtleCrypto가 없는 HTTP LAN(iPhone)용 SHA-256 */
function sha256HexFallback(message: string): string {
  const K = new Uint32Array([
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1,
    0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3,
    0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786,
    0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147,
    0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13,
    0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b,
    0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a,
    0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208,
    0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
  ]);

  const bytes = toUtf8Bytes(message);
  const bitLen = bytes.length * 8;
  const withPadding = new Uint8Array(((bytes.length + 9 + 63) >> 6) << 6);
  withPadding.set(bytes);
  withPadding[bytes.length] = 0x80;
  const view = new DataView(withPadding.buffer);
  view.setUint32(withPadding.length - 4, bitLen >>> 0);

  let h0 = 0x6a09e667;
  let h1 = 0xbb67ae85;
  let h2 = 0x3c6ef372;
  let h3 = 0xa54ff53a;
  let h4 = 0x510e527f;
  let h5 = 0x9b05688c;
  let h6 = 0x1f83d9ab;
  let h7 = 0x5be0cd19;

  const w = new Uint32Array(64);
  const rotr = (value: number, n: number) =>
    (value >>> n) | (value << (32 - n));

  for (let offset = 0; offset < withPadding.length; offset += 64) {
    for (let i = 0; i < 16; i += 1) {
      w[i] = view.getUint32(offset + i * 4);
    }
    for (let i = 16; i < 64; i += 1) {
      const s0 =
        rotr(w[i - 15], 7) ^ rotr(w[i - 15], 18) ^ (w[i - 15] >>> 3);
      const s1 =
        rotr(w[i - 2], 17) ^ rotr(w[i - 2], 19) ^ (w[i - 2] >>> 10);
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0;
    }

    let a = h0;
    let b = h1;
    let c = h2;
    let d = h3;
    let e = h4;
    let f = h5;
    let g = h6;
    let h = h7;

    for (let i = 0; i < 64; i += 1) {
      const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
      const ch = (e & f) ^ (~e & g);
      const temp1 = (h + S1 + ch + K[i] + w[i]) >>> 0;
      const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (S0 + maj) >>> 0;

      h = g;
      g = f;
      f = e;
      e = (d + temp1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) >>> 0;
    }

    h0 = (h0 + a) >>> 0;
    h1 = (h1 + b) >>> 0;
    h2 = (h2 + c) >>> 0;
    h3 = (h3 + d) >>> 0;
    h4 = (h4 + e) >>> 0;
    h5 = (h5 + f) >>> 0;
    h6 = (h6 + g) >>> 0;
    h7 = (h7 + h) >>> 0;
  }

  const out = new Uint8Array(32);
  const outView = new DataView(out.buffer);
  outView.setUint32(0, h0);
  outView.setUint32(4, h1);
  outView.setUint32(8, h2);
  outView.setUint32(12, h3);
  outView.setUint32(16, h4);
  outView.setUint32(20, h5);
  outView.setUint32(24, h6);
  outView.setUint32(28, h7);
  return bytesToHex(out);
}

async function sha256Hex(message: string): Promise<string> {
  if (globalThis.crypto?.subtle) {
    const bytes = toUtf8Bytes(message);
    const hashBuffer = await crypto.subtle.digest(
      "SHA-256",
      bytes.buffer.slice(
        bytes.byteOffset,
        bytes.byteOffset + bytes.byteLength,
      ) as ArrayBuffer,
    );
    return bytesToHex(new Uint8Array(hashBuffer));
  }

  // iPhone Safari + http://172.x.x.x 는 secure context가 아니라 subtle 없음
  return sha256HexFallback(message);
}

async function hashPassword(password: string): Promise<string> {
  const salt = createId();
  const hash = await sha256Hex(`${salt}:${password}`);
  return `${salt}:${hash}`;
}

async function verifyPassword(
  password: string,
  storedHash: string,
): Promise<boolean> {
  const separator = storedHash.indexOf(":");
  if (separator <= 0) {
    return false;
  }

  const salt = storedHash.slice(0, separator);
  const expectedHash = storedHash.slice(separator + 1);
  if (!expectedHash) {
    return false;
  }

  const hash = await sha256Hex(`${salt}:${password}`);
  return hash === expectedHash;
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function toSession(user: Pick<AuthUser, "id" | "email" | "name" | "nickname">): AuthSession {
  return {
    userId: user.id,
    email: user.email,
    name: user.name,
    nickname: user.nickname,
  };
}

export function getSession(): AuthSession | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) {
      return null;
    }
    const session = JSON.parse(raw) as AuthSession & { id?: string };
    return {
      ...session,
      userId: session.userId ?? session.id ?? "",
      nickname: session.nickname ?? session.name,
    };
  } catch {
    return null;
  }
}

export function isAuthenticated(): boolean {
  return getSession() !== null;
}

export function setSession(session: AuthSession): void {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function clearSession(): void {
  localStorage.removeItem(SESSION_KEY);
}

async function signUpLocal(
  name: string,
  nickname: string,
  email: string,
  password: string,
): Promise<
  | { ok: true; user: AuthUser; session: AuthSession }
  | { ok: false; error: string }
> {
  const users = loadUsers();
  if (users.some((user) => user.email === email)) {
    return { ok: false, error: "이미 가입된 이메일입니다." };
  }

  const newUser: AuthUser = {
    id: createId(),
    name,
    nickname,
    email,
    passwordHash: await hashPassword(password),
  };

  saveUsers([...users, newUser]);
  const session = toSession(newUser);
  setSession(session);
  return { ok: true, user: newUser, session };
}

async function signInLocal(
  email: string,
  password: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const users = loadUsers();
  const user = users.find((entry) => entry.email === email);

  if (!user) {
    return { ok: false, error: "이메일 또는 비밀번호가 올바르지 않습니다." };
  }

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) {
    return { ok: false, error: "이메일 또는 비밀번호가 올바르지 않습니다." };
  }

  setSession(toSession(user));
  return { ok: true };
}

async function resetPasswordLocal(
  email: string,
  password: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const users = loadUsers();
  const index = users.findIndex((user) => user.email === email);

  if (index === -1) {
    return { ok: false, error: "등록되지 않은 이메일입니다." };
  }

  const next = [...users];
  next[index] = {
    ...next[index],
    passwordHash: await hashPassword(password),
  };
  saveUsers(next);
  return { ok: true };
}

export async function signUp(
  name: string,
  nickname: string,
  email: string,
  password: string,
): Promise<
  | { ok: true; user: AuthUser; session: AuthSession }
  | { ok: false; error: string }
> {
  if (typeof window === "undefined") {
    return { ok: false, error: "브라우저에서만 회원가입할 수 있습니다." };
  }

  try {
    const trimmedName = name.trim();
    const trimmedNickname = nickname.trim();
    const normalizedEmail = normalizeEmail(email);

    if (!trimmedName) {
      return { ok: false, error: "이름을 입력해 주세요." };
    }

    if (!trimmedNickname) {
      return { ok: false, error: "닉네임을 입력해 주세요." };
    }

    if (!normalizedEmail) {
      return { ok: false, error: "이메일을 입력해 주세요." };
    }

    if (password.length < 6) {
      return { ok: false, error: "비밀번호는 6자 이상이어야 합니다." };
    }

    // Apps Script URL이 있으면 시트를 기준으로 가입 (기기 간 공유)
    if (isGoogleSheetSyncEnabled()) {
      const passwordHash = await hashPassword(password);
      const userId = createId();
      const remote = await postAppsScriptAuth("signup", {
        created_at: new Date().toISOString(),
        user_id: userId,
        name: trimmedName,
        nickname: trimmedNickname,
        email: normalizedEmail,
        password_hash: passwordHash,
      });

      if (!remote.ok) {
        return { ok: false, error: remote.error };
      }

      const newUser: AuthUser = {
        id: remote.data.user_id || userId,
        name: remote.data.name || trimmedName,
        nickname: remote.data.nickname || trimmedNickname,
        email: normalizeEmail(remote.data.email || normalizedEmail),
        passwordHash,
      };

      upsertLocalUser(newUser);
      const session = toSession(newUser);
      setSession(session);
      return { ok: true, user: newUser, session };
    }

    return signUpLocal(
      trimmedName,
      trimmedNickname,
      normalizedEmail,
      password,
    );
  } catch {
    return { ok: false, error: "회원가입 처리 중 오류가 발생했습니다." };
  }
}

export async function signIn(
  email: string,
  password: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (typeof window === "undefined") {
    return { ok: false, error: "브라우저에서만 로그인할 수 있습니다." };
  }

  const normalizedEmail = normalizeEmail(email);

  if (!normalizedEmail) {
    return { ok: false, error: "이메일을 입력해 주세요." };
  }

  if (!password) {
    return { ok: false, error: "비밀번호를 입력해 주세요." };
  }

  // Apps Script URL이 있으면 원격 검증 우선 (다른 기기에서도 로그인)
  if (isGoogleSheetSyncEnabled()) {
    const remote = await postAppsScriptAuth("login", {
      email: normalizedEmail,
      password,
    });

    if (remote.ok) {
      const passwordHash = await hashPassword(password);
      const user: AuthUser = {
        id: remote.data.user_id,
        name: remote.data.name,
        nickname: remote.data.nickname || remote.data.name,
        email: normalizeEmail(remote.data.email),
        passwordHash,
      };
      upsertLocalUser(user);
      setSession(toSession(user));
      return { ok: true };
    }

    // 네트워크/배포 오류가 아니라 인증 실패면 로컬로 우회하지 않음
    const authFailure =
      remote.error.includes("비밀번호") ||
      remote.error.includes("이메일") ||
      remote.error.includes("등록되지") ||
      remote.error.includes("올바르지");

    if (authFailure) {
      return { ok: false, error: remote.error };
    }

    // 배포본에 login API가 아직 없으면 명확히 안내
    if (
      remote.error.includes("Unknown") ||
      remote.error.includes("HTML") ||
      remote.error.includes("배포")
    ) {
      return {
        ok: false,
        error:
          "원격 로그인을 사용할 수 없습니다. Apps Script를 새 버전으로 재배포해 주세요.",
      };
    }

    // Apps Script 일시 장애 시에만 이 기기 localStorage로 폴백
    const local = await signInLocal(normalizedEmail, password);
    if (local.ok) {
      return local;
    }

    return { ok: false, error: remote.error };
  }

  return signInLocal(normalizedEmail, password);
}

export async function resetPassword(
  email: string,
  password: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (typeof window === "undefined") {
    return { ok: false, error: "브라우저에서만 변경할 수 있습니다." };
  }

  const normalizedEmail = normalizeEmail(email);

  if (!normalizedEmail) {
    return { ok: false, error: "이메일을 입력해 주세요." };
  }

  if (password.length < 6) {
    return { ok: false, error: "비밀번호는 6자 이상이어야 합니다." };
  }

  const passwordHash = await hashPassword(password);

  if (isGoogleSheetSyncEnabled()) {
    const remote = await postAppsScriptAuth("reset_password", {
      email: normalizedEmail,
      password_hash: passwordHash,
    });

    if (!remote.ok) {
      return { ok: false, error: remote.error };
    }

    const users = loadUsers();
    const index = users.findIndex((user) => user.email === normalizedEmail);
    if (index === -1) {
      upsertLocalUser({
        id: remote.data.user_id,
        name: remote.data.name,
        nickname: remote.data.nickname || remote.data.name,
        email: normalizeEmail(remote.data.email),
        passwordHash,
      });
    } else {
      const next = [...users];
      next[index] = {
        ...next[index],
        passwordHash,
        name: remote.data.name || next[index].name,
        nickname: remote.data.nickname || next[index].nickname,
        id: remote.data.user_id || next[index].id,
      };
      saveUsers(next);
    }

    return { ok: true };
  }

  return resetPasswordLocal(normalizedEmail, password);
}
