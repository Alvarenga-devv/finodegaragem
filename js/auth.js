/**
 * FINO DE GARAGEM — Autenticação (demo)
 *
 * Usa Web Crypto (SHA-256 + salt) para nunca gravar senha em texto puro,
 * mesmo em localStorage. Em produção, isso é substituído pelo Supabase
 * Auth (bcrypt/argon2 no servidor) — ver /backend/README.md.
 */
(function (global) {
  "use strict";

  const SESSION_KEY = global.FDG.SESSION_KEY;

  async function sha256Hex(text) {
    const enc = new TextEncoder().encode(text);
    const buf = await crypto.subtle.digest("SHA-256", enc);
    return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
  }

  async function hashPassword(password, salt) {
    salt = salt || crypto.getRandomValues(new Uint32Array(4)).join("-");
    const hash = await sha256Hex(salt + ":" + password);
    return `${salt}$${hash}`;
  }

  async function verifyPassword(password, stored) {
    if (!stored) return false;
    const [salt, hash] = stored.split("$");
    const check = await sha256Hex(salt + ":" + password);
    return check === hash;
  }

  // Senhas de demonstração (texto puro aqui SOMENTE para o seed inicial de
  // dados fictícios — nunca persistidas em claro; são hasheadas no primeiro uso).
  const DEMO_PASSWORDS = {
    "admin@finodegaragem.com": "admin123",
    "joao@finodegaragem.com": "barbeiro123",
    "pedro.cliente@exemplo.com": "cliente123",
    "lucas.cliente@exemplo.com": "cliente123",
    "rafael.cliente@exemplo.com": "cliente123",
  };

  async function ensureSeedPasswords() {
    const db = global.FDG.db;
    for (const email of Object.keys(DEMO_PASSWORDS)) {
      const user = db.getUserByEmail(email);
      if (user && !user.passwordHash) {
        user.passwordHash = await hashPassword(DEMO_PASSWORDS[email]);
      }
    }
    // força persistência
    db.getSettings();
    localStorage.setItem("fdg_db_v1", JSON.stringify(JSON.parse(localStorage.getItem("fdg_db_v1"))));
  }

  async function login(email, password) {
    const db = global.FDG.db;
    const user = db.getUserByEmail(email);
    if (!user) return { ok: false, error: "E-mail ou senha incorretos." };
    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) return { ok: false, error: "E-mail ou senha incorretos." };
    setSession(user.id);
    return { ok: true, user };
  }

  async function registerClient({ name, email, phone, password }) {
    const db = global.FDG.db;
    const passwordHash = await hashPassword(password);
    const result = db.createClientUser({ name, email, phone, passwordHash });
    if (!result.ok) return result;
    setSession(result.user.id);
    return { ok: true, user: result.user };
  }

  function setSession(userId) {
    localStorage.setItem(SESSION_KEY, JSON.stringify({ userId, at: Date.now() }));
  }

  function getSession() {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  function currentUser() {
    const session = getSession();
    if (!session) return null;
    return global.FDG.db.getUser(session.userId);
  }

  function logout() {
    localStorage.removeItem(SESSION_KEY);
  }

  /**
   * Guarda de rota no front-end — conveniência de UX apenas.
   * A autorização REAL (quem pode ver/alterar o quê) deve sempre ser
   * reforçada no backend/RLS, nunca só aqui. Ver seção 14 do briefing.
   */
  function requireRole(roles, redirectTo) {
    const user = currentUser();
    if (!user || !roles.includes(user.role)) {
      window.location.href = redirectTo || "login.html";
      return null;
    }
    return user;
  }

  global.FDG.auth = {
    hashPassword, verifyPassword, login, registerClient, logout,
    getSession, currentUser, requireRole, ensureSeedPasswords,
  };
})(window);
