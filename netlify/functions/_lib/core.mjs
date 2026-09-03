import { getStore } from "@netlify/blobs";
import bootstrap from "../_config/bootstrap.json" with { type: "json" };
import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCallback);
const SESSION_COOKIE = "rt_session";
const SESSION_SECONDS = 60 * 60 * 12;

export const fail = (message, status = 400) => {
  const error = new Error(message);
  error.status = status;
  return error;
};

export const json = (data, status = 200, headers = {}) =>
  Response.json(data, {
    status,
    headers: { "Cache-Control": "no-store", ...headers }
  });

export const errorResponse = (error) =>
  json(
    { message: error && error.message ? error.message : "Erro interno." },
    error && error.status ? error.status : 500
  );

export const assertMethod = (req, methods) => {
  if (!methods.includes(req.method)) throw fail("Método não permitido.", 405);
};

export const assertSameOrigin = (req) => {
  const origin = req.headers.get("origin");
  const expected = new URL(req.url).origin;
  if (!origin || origin !== expected) throw fail("Origem da requisição inválida.", 403);
};

const authStore = () => getStore({ name: "retorna-admin", consistency: "strong" });
export const contentStore = () => getStore({ name: "retorna-content", consistency: "strong" });
const rateStore = () => getStore({ name: "retorna-rate-limit", consistency: "strong" });
const digest = (value) => createHash("sha256").update(value).digest("hex");

const passwordHash = async (password, salt) => {
  const derived = await scrypt(password, salt, 64);
  return Buffer.from(derived).toString("hex");
};

const verifyPassword = async (password, account) => {
  const candidate = Buffer.from(await passwordHash(password, account.salt), "hex");
  const expected = Buffer.from(account.passwordHash, "hex");
  return candidate.length === expected.length && timingSafeEqual(candidate, expected);
};

const normalizeEmail = (email) => String(email || "").trim().toLowerCase();
const getAccount = async () => authStore().get("account", { type: "json", consistency: "strong" });

const saveAccount = async (account) => {
  await authStore().setJSON("account", account);
  return account;
};

export const bootstrapOrAuthenticate = async (email, password) => {
  const normalizedEmail = normalizeEmail(email);
  let account = await getAccount();

  if (!account) {
    const bootstrapEmailHash = String(bootstrap.emailHash || "");
    const bootstrapSalt = String(bootstrap.salt || "");
    const bootstrapPasswordHash = String(bootstrap.passwordHash || "");

    if (!bootstrapEmailHash || !bootstrapSalt || !bootstrapPasswordHash) {
      throw fail("Acesso inicial ainda não foi configurado.", 503);
    }

    const emailMatches = digest(normalizedEmail) === bootstrapEmailHash;
    const passwordMatches = await verifyPassword(password, {
      salt: bootstrapSalt,
      passwordHash: bootstrapPasswordHash
    });

    if (!emailMatches || !passwordMatches) {
      throw fail("E-mail ou senha inválidos.", 401);
    }

    account = {
      email: normalizedEmail,
      salt: bootstrapSalt,
      passwordHash: bootstrapPasswordHash,
      mustChangePassword: true,
      sessionVersion: 1,
      createdAt: Date.now()
    };

    const result = await authStore().setJSON("account", account, { onlyIfNew: true });
    if (!result.modified) account = await getAccount();
  }

  if (normalizeEmail(account.email) !== normalizedEmail || !(await verifyPassword(password, account))) {
    throw fail("E-mail ou senha inválidos.", 401);
  }

  return account;
};

export const checkLoginRate = async (ip) => {
  const key = "login/" + digest(ip || "unknown");
  const store = rateStore();
  const now = Date.now();
  const state = await store.get(key, { type: "json", consistency: "strong" });
  if (state && state.resetAt > now && state.count >= 8) {
    throw fail("Muitas tentativas. Tente novamente em alguns minutos.", 429);
  }
  return { key, state };
};

export const recordLoginFailure = async (key, state) => {
  const now = Date.now();
  const next = !state || state.resetAt <= now
    ? { count: 1, resetAt: now + 10 * 60 * 1000 }
    : { count: state.count + 1, resetAt: state.resetAt };
  await rateStore().setJSON(key, next);
};

export const clearLoginFailures = async (key) => rateStore().delete(key);
const sessionKey = (token) => "session/" + digest(token);

export const createSession = async (account) => {
  const token = randomBytes(32).toString("base64url");
  await authStore().setJSON(sessionKey(token), {
    email: account.email,
    version: account.sessionVersion,
    expiresAt: Date.now() + SESSION_SECONDS * 1000
  });

  return {
    token,
    cookie: SESSION_COOKIE + "=" + token +
      "; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=" + SESSION_SECONDS
  };
};

const readCookie = (req, name) => {
  const parts = (req.headers.get("cookie") || "").split(";").map((item) => item.trim());
  for (const part of parts) {
    const index = part.indexOf("=");
    if (index >= 0 && part.slice(0, index) === name) return part.slice(index + 1);
  }
  return "";
};

export const requireSession = async (req, { allowPasswordChange = false } = {}) => {
  const token = readCookie(req, SESSION_COOKIE);
  if (!token) throw fail("Sessão expirada. Entre novamente.", 401);

  const store = authStore();
  const session = await store.get(sessionKey(token), { type: "json", consistency: "strong" });

  if (!session || session.expiresAt <= Date.now()) {
    if (session) await store.delete(sessionKey(token));
    throw fail("Sessão expirada. Entre novamente.", 401);
  }

  const account = await getAccount();
  if (!account || session.email !== account.email || session.version !== account.sessionVersion) {
    await store.delete(sessionKey(token));
    throw fail("Sessão inválida. Entre novamente.", 401);
  }

  if (account.mustChangePassword && !allowPasswordChange) {
    throw fail("Troque a senha temporária antes de continuar.", 428);
  }

  return { account, token };
};

export const changePassword = async (account, currentPassword, newPassword) => {
  if (!(await verifyPassword(currentPassword, account))) throw fail("A senha atual está incorreta.", 401);

  const value = String(newPassword || "");
  if (value.length < 12 || !/[A-Za-z]/.test(value) || !/[0-9]/.test(value) || !/[^A-Za-z0-9]/.test(value)) {
    throw fail("Use ao menos 12 caracteres, com letras, número e caractere especial.", 400);
  }

  const salt = randomBytes(16).toString("hex");
  return saveAccount({
    ...account,
    salt,
    passwordHash: await passwordHash(value, salt),
    mustChangePassword: false,
    sessionVersion: account.sessionVersion + 1,
    passwordChangedAt: Date.now()
  });
};

export const destroySession = async (token) => {
  if (token) await authStore().delete(sessionKey(token));
};

export const expiredCookie = SESSION_COOKIE + "=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0";

export const validateServices = (services) => {
  if (!Array.isArray(services) || services.length > 50) throw fail("Lista de serviços inválida.", 400);

  return services.map((service) => {
    const id = String(service.id || "").trim();
    const title = String(service.title || "").trim();
    const description = String(service.description || "").trim();
    const points = Array.isArray(service.points)
      ? service.points.map((item) => String(item).trim()).filter(Boolean).slice(0, 12)
      : [];

    if (!id || id.length > 80 || !title || title.length > 100 || !description || description.length > 1600) {
      throw fail("Há um serviço com dados inválidos.", 400);
    }

    return { id, title, description, points, active: service.active !== false };
  });
};
