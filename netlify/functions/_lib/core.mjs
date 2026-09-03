import { getStore } from "@netlify/blobs";
import {
  createHash,
  randomBytes,
  randomUUID,
  scrypt as scryptCallback,
  timingSafeEqual
} from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCallback);
const SESSION_COOKIE = "rt_session";
const SESSION_SECONDS = 60 * 60 * 12;
const MAX_USERS = 20;
const MASTER_ID = "retorna-master";
const MASTER_SESSION_VERSION = 1;
const LEGACY_MASTER_USER_ID = "owner-b88675c26ba89aba";

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
const normalizeEmail = (email) => String(email || "").trim().toLowerCase();

const passwordHash = async (password, salt) => {
  const derived = await scrypt(password, salt, 64);
  return Buffer.from(derived).toString("hex");
};

const verifyPassword = async (password, credential) => {
  const candidate = Buffer.from(await passwordHash(password, credential.salt), "hex");
  const expected = Buffer.from(credential.passwordHash, "hex");
  return candidate.length === expected.length && timingSafeEqual(candidate, expected);
};

const validatePassword = (password) => {
  const value = String(password || "");
  if (
    value.length < 12 ||
    !/[A-Za-z]/.test(value) ||
    !/[0-9]/.test(value) ||
    !/[^A-Za-z0-9]/.test(value)
  ) {
    throw fail("Use ao menos 12 caracteres, com letras, número e caractere especial.", 400);
  }
  return value;
};

const masterPrincipal = () => ({
  id: MASTER_ID,
  name: "Retorna",
  role: "master",
  active: true,
  mustChangePassword: false,
  sessionVersion: MASTER_SESSION_VERSION,
  isMaster: true
});

const authenticateMaster = async (email, password) => {
  const normalizedEmail = normalizeEmail(email);
  const emailHash = String(process.env.MASTER_EMAIL_HASH || "");
  const salt = String(process.env.MASTER_SALT || "");
  const storedPasswordHash = String(process.env.MASTER_PASSWORD_HASH || "");

  if (!emailHash || !salt || !storedPasswordHash) {
    throw fail("Acesso Master ainda não foi configurado.", 503);
  }

  if (digest(normalizedEmail) !== emailHash) return null;

  const valid = await verifyPassword(password, {
    salt,
    passwordHash: storedPasswordHash
  });

  if (!valid) throw fail("E-mail ou senha inválidos.", 401);

  return masterPrincipal();
};

const publicUser = (user) => ({
  id: user.id,
  name: user.name || "",
  email: user.email,
  role: user.role,
  active: user.active !== false,
  mustChangePassword: user.mustChangePassword === true,
  createdAt: user.createdAt || null,
  updatedAt: user.updatedAt || null
});

const saveUsers = async (users) => {
  await authStore().setJSON("users", users);
  return users;
};

export const getUsers = async () => {
  const store = authStore();
  const stored = await store.get("users", {
    type: "json",
    consistency: "strong"
  });

  if (!Array.isArray(stored)) return [];

  const users = stored.filter((user) => user && user.id !== LEGACY_MASTER_USER_ID);

  if (users.length !== stored.length) {
    await saveUsers(users);
  }

  return users;
};

const findUserById = (users, id) => users.find((user) => user.id === id);
const findUserByEmail = (users, email) =>
  users.find((user) => normalizeEmail(user.email) === normalizeEmail(email));

export const authenticatePrincipal = async (email, password) => {
  const master = await authenticateMaster(email, password);
  if (master) return master;

  const users = await getUsers();
  const user = findUserByEmail(users, email);

  if (!user || user.active === false || !(await verifyPassword(password, user))) {
    throw fail("E-mail ou senha inválidos.", 401);
  }

  return user;
};

export const bootstrapOrAuthenticate = authenticatePrincipal;

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

export const createSession = async (principal) => {
  const token = randomBytes(32).toString("base64url");
  const session = principal.role === "master"
    ? {
        principalType: "master",
        version: MASTER_SESSION_VERSION,
        expiresAt: Date.now() + SESSION_SECONDS * 1000
      }
    : {
        principalType: "user",
        userId: principal.id,
        version: principal.sessionVersion,
        expiresAt: Date.now() + SESSION_SECONDS * 1000
      };

  await authStore().setJSON(sessionKey(token), session);

  return {
    token,
    cookie:
      SESSION_COOKIE + "=" + token +
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
  const session = await store.get(sessionKey(token), {
    type: "json",
    consistency: "strong"
  });

  if (!session || session.expiresAt <= Date.now()) {
    if (session) await store.delete(sessionKey(token));
    throw fail("Sessão expirada. Entre novamente.", 401);
  }

  if (session.principalType === "master") {
    if (session.version !== MASTER_SESSION_VERSION) {
      await store.delete(sessionKey(token));
      throw fail("Sessão inválida. Entre novamente.", 401);
    }

    return { user: masterPrincipal(), account: masterPrincipal(), token };
  }

  const users = await getUsers();
  const user = findUserById(users, session.userId);

  if (!user || user.active === false || session.version !== user.sessionVersion) {
    await store.delete(sessionKey(token));
    throw fail("Sessão inválida. Entre novamente.", 401);
  }

  if (user.mustChangePassword && !allowPasswordChange) {
    throw fail("Troque a senha temporária antes de continuar.", 428);
  }

  return { user, account: user, token };
};

export const requireOwner = (user) => {
  if (!user || !["master", "owner"].includes(user.role)) {
    throw fail("Acesso restrito ao proprietário.", 403);
  }
};

export const changePassword = async (user, currentPassword, newPassword) => {
  if (user.role === "master") {
    throw fail("A credencial Master é gerenciada pela Retorna.", 403);
  }

  if (!(await verifyPassword(currentPassword, user))) {
    throw fail("A senha atual está incorreta.", 401);
  }

  const value = validatePassword(newPassword);
  const users = await getUsers();
  const index = users.findIndex((item) => item.id === user.id);
  if (index < 0) throw fail("Usuário não encontrado.", 404);

  const salt = randomBytes(16).toString("hex");
  users[index] = {
    ...users[index],
    salt,
    passwordHash: await passwordHash(value, salt),
    mustChangePassword: false,
    sessionVersion: Number(users[index].sessionVersion || 1) + 1,
    passwordChangedAt: Date.now(),
    updatedAt: Date.now()
  };

  await saveUsers(users);
  return users[index];
};

export const listManagedUsers = async () => {
  const users = await getUsers();
  return users
    .map(publicUser)
    .sort((a, b) => {
      if (a.role !== b.role) return a.role === "owner" ? -1 : 1;
      return a.email.localeCompare(b.email);
    });
};

export const createManagedUser = async (actor, input = {}) => {
  requireOwner(actor);
  const users = await getUsers();

  if (users.length >= MAX_USERS) throw fail("Limite de usuários atingido.", 400);

  const email = normalizeEmail(input.email);
  const name = String(input.name || "").trim().slice(0, 100);
  const requestedRole = input.role === "owner" ? "owner" : "editor";
  const role =
    actor.role === "master" && activeOwnerCount(users) === 0
      ? "owner"
      : requestedRole;
  const temporaryPassword = validatePassword(input.temporaryPassword);

  if (!email || !email.includes("@")) throw fail("Informe um e-mail válido.", 400);
  if (digest(email) === String(process.env.MASTER_EMAIL_HASH || "")) {
    throw fail("Este e-mail é reservado para a administração da Retorna.", 409);
  }
  if (findUserByEmail(users, email)) throw fail("Já existe um usuário com este e-mail.", 409);

  const salt = randomBytes(16).toString("hex");
  const now = Date.now();
  const user = {
    id: randomUUID(),
    name,
    email,
    role,
    active: true,
    salt,
    passwordHash: await passwordHash(temporaryPassword, salt),
    mustChangePassword: true,
    sessionVersion: 1,
    createdAt: now,
    updatedAt: now,
    createdBy: actor.id
  };

  users.push(user);
  await saveUsers(users);
  return publicUser(user);
};

const activeOwnerCount = (users) =>
  users.filter((user) => user.role === "owner" && user.active !== false).length;

export const updateManagedUser = async (actor, id, input = {}) => {
  requireOwner(actor);
  const users = await getUsers();
  const index = users.findIndex((user) => user.id === id);
  if (index < 0) throw fail("Usuário não encontrado.", 404);

  const current = users[index];
  const nextRole = input.role === "owner" ? "owner" : "editor";
  const nextActive = input.active !== false;
  const nextName = String(input.name ?? current.name ?? "").trim().slice(0, 100);

  if (current.id === actor.id && (nextRole !== "owner" || !nextActive)) {
    throw fail("Você não pode remover seu próprio acesso de proprietário.", 400);
  }

  const removesActiveOwner =
    current.role === "owner" &&
    current.active !== false &&
    (nextRole !== "owner" || !nextActive);

  if (removesActiveOwner && activeOwnerCount(users) <= 1) {
    throw fail("É necessário manter pelo menos um proprietário ativo.", 400);
  }

  users[index] = {
    ...current,
    name: nextName,
    role: nextRole,
    active: nextActive,
    sessionVersion:
      current.role !== nextRole || current.active !== nextActive
        ? Number(current.sessionVersion || 1) + 1
        : current.sessionVersion,
    updatedAt: Date.now()
  };

  await saveUsers(users);
  return publicUser(users[index]);
};

export const resetManagedUserPassword = async (actor, id, temporaryPassword) => {
  requireOwner(actor);

  if (actor.role !== "master" && actor.id === id) {
    throw fail("Altere sua própria senha pelo fluxo de segurança.", 400);
  }

  const value = validatePassword(temporaryPassword);
  const users = await getUsers();
  const index = users.findIndex((user) => user.id === id);
  if (index < 0) throw fail("Usuário não encontrado.", 404);

  const salt = randomBytes(16).toString("hex");
  users[index] = {
    ...users[index],
    salt,
    passwordHash: await passwordHash(value, salt),
    mustChangePassword: true,
    sessionVersion: Number(users[index].sessionVersion || 1) + 1,
    updatedAt: Date.now()
  };

  await saveUsers(users);
  return publicUser(users[index]);
};

export const deleteManagedUser = async (actor, id) => {
  requireOwner(actor);

  if (actor.role !== "master" && actor.id === id) {
    throw fail("Você não pode excluir seu próprio usuário.", 400);
  }

  const users = await getUsers();
  const target = findUserById(users, id);
  if (!target) throw fail("Usuário não encontrado.", 404);

  if (
    target.role === "owner" &&
    target.active !== false &&
    activeOwnerCount(users) <= 1
  ) {
    throw fail("Cadastre outro proprietário ativo antes de remover este.", 400);
  }

  await saveUsers(users.filter((user) => user.id !== id));
};

export const destroySession = async (token) => {
  if (token) await authStore().delete(sessionKey(token));
};

export const expiredCookie =
  SESSION_COOKIE + "=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0";

export const validateServices = (services) => {
  if (!Array.isArray(services) || services.length > 50) {
    throw fail("Lista de serviços inválida.", 400);
  }

  return services.map((service) => {
    const id = String(service.id || "").trim();
    const title = String(service.title || "").trim();
    const description = String(service.description || "").trim();
    const points = Array.isArray(service.points)
      ? service.points.map((item) => String(item).trim()).filter(Boolean).slice(0, 12)
      : [];

    if (
      !id ||
      id.length > 80 ||
      !title ||
      title.length > 100 ||
      !description ||
      description.length > 1600
    ) {
      throw fail("Há um serviço com dados inválidos.", 400);
    }

    return {
      id,
      title,
      description,
      points,
      active: service.active !== false
    };
  });
};
