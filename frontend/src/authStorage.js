const storage = window.sessionStorage;
const ACTIVE_SESSION_KEY = "auth:activeSession";
const AUTH_EVENT_KEY = "auth:event";
const SESSION_KEYS = ["token", "role", "faceVerified", "loginCount", "username", "displayName", "sessionId", "accountKey"];

const buildAccountKey = (role, username) => `${role || "unknown"}:${username || "unknown"}`;

const generateSessionId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

export const authStorage = {
  get(key) {
    return storage.getItem(key);
  },
  set(key, value) {
    storage.setItem(key, String(value));
  },
  remove(key) {
    storage.removeItem(key);
  },
  getAccountKey() {
    return storage.getItem("accountKey");
  },
  getSessionId() {
    return storage.getItem("sessionId");
  },
  beginSession({ role, username }) {
    const sessionId = generateSessionId();
    const accountKey = buildAccountKey(role, username);

    storage.setItem("sessionId", sessionId);
    storage.setItem("accountKey", accountKey);

    window.localStorage.setItem(ACTIVE_SESSION_KEY, JSON.stringify({ accountKey, sessionId, at: Date.now() }));
    window.localStorage.setItem(AUTH_EVENT_KEY, JSON.stringify({ type: "login", accountKey, sessionId, at: Date.now() }));

    return { sessionId, accountKey };
  },
  isCurrentSessionActive() {
    const accountKey = storage.getItem("accountKey");
    const sessionId = storage.getItem("sessionId");

    if (!accountKey || !sessionId) return true;

    const raw = window.localStorage.getItem(ACTIVE_SESSION_KEY);
    if (!raw) return true;

    try {
      const activeSession = JSON.parse(raw);
      if (activeSession.accountKey !== accountKey) return true;
      return activeSession.sessionId === sessionId;
    } catch (error) {
      return true;
    }
  },
  clearSession({ broadcast = true } = {}) {
    const accountKey = storage.getItem("accountKey");
    const sessionId = storage.getItem("sessionId");

    if (broadcast && accountKey && sessionId) {
      const raw = window.localStorage.getItem(ACTIVE_SESSION_KEY);
      if (raw) {
        try {
          const activeSession = JSON.parse(raw);
          if (activeSession.accountKey === accountKey && activeSession.sessionId === sessionId) {
            window.localStorage.removeItem(ACTIVE_SESSION_KEY);
          }
        } catch (error) {
          window.localStorage.removeItem(ACTIVE_SESSION_KEY);
        }
      }

      window.localStorage.setItem(AUTH_EVENT_KEY, JSON.stringify({ type: "logout", accountKey, sessionId, at: Date.now() }));
    }

    SESSION_KEYS.forEach((key) => {
      storage.removeItem(key);
    });
  }
};

export default authStorage;
