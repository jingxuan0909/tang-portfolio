import { createHash, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";

// This legacy development API edits local JSON when running the Vite server.
const CONTENT_FILE = path.resolve("data/content.json");
const UPLOAD_DIR = path.resolve("public/uploads");
const sessions = new Map();
const loginAttempts = new Map();
const SESSION_TTL = 8 * 60 * 60 * 1000;

// Sends a no-cache JSON response through the Node development server.
function json(res, status, payload, headers = {}) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  for (const [key, value] of Object.entries(headers)) res.setHeader(key, value);
  res.end(JSON.stringify(payload));
}

// Reads a small JSON body and stops oversized requests.
async function readBody(req) {
  let raw = "";
  for await (const chunk of req) {
    raw += chunk;
    if (raw.length > 1_000_000) throw new Error("Payload too large");
  }
  return raw ? JSON.parse(raw) : {};
}

// Converts the Cookie header into an easy key-value object.
function cookies(req) {
  return Object.fromEntries(
    (req.headers.cookie || "")
      .split(";")
      .map((item) => item.trim().split("="))
      .filter(([key]) => key)
      .map(([key, value]) => [key, decodeURIComponent(value || "")]),
  );
}

// Hashes session tokens before storing them in memory.
function hashToken(token) {
  return createHash("sha256").update(token).digest("hex");
}

// Loads a valid non-expired local development session.
function getSession(req) {
  const token = cookies(req).portfolio_session;
  if (!token) return null;
  const key = hashToken(token);
  const session = sessions.get(key);
  if (!session || session.expiresAt < Date.now()) {
    sessions.delete(key);
    return null;
  }
  return { ...session, key };
}

// Checks a password against its stored scrypt salt and hash.
function validPassword(password, encoded) {
  const [salt, expectedHex] = (encoded || "").split(":");
  if (!salt || !expectedHex) return false;
  const actual = scryptSync(password, salt, 64);
  const expected = Buffer.from(expectedHex, "hex");
  return expected.length === actual.length && timingSafeEqual(actual, expected);
}

// Blocks an IP after five failed logins within fifteen minutes.
function isRateLimited(ip) {
  const now = Date.now();
  const recent = (loginAttempts.get(ip) || []).filter((time) => now - time < 15 * 60 * 1000);
  loginAttempts.set(ip, recent);
  return recent.length >= 5;
}

// Records the time of one failed login attempt.
function recordFailure(ip) {
  loginAttempts.set(ip, [...(loginAttempts.get(ip) || []), Date.now()]);
}

// Checks required sections and safe maximum list sizes.
function validateContent(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Invalid content");
  if (!Array.isArray(value.projects) || value.projects.length > 50) throw new Error("Invalid projects");
  if (!Array.isArray(value.semesterResults) || value.semesterResults.length > 20) throw new Error("Invalid results");
  if (!Array.isArray(value.extraCurricularActivities) || value.extraCurricularActivities.length > 50) throw new Error("Invalid activities");
  if (!Array.isArray(value.awards) || value.awards.length > 100) throw new Error("Invalid awards");
  if (!Array.isArray(value.certifications) || value.certifications.length > 100) throw new Error("Invalid certifications");
  if (!value.profile || !value.about || !value.contact) throw new Error("Missing required sections");
  return value;
}

// Reads an upload while enforcing the ten-megabyte limit.
async function readUpload(req, limit = 10 * 1024 * 1024) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > limit) throw new Error("File must be 10 MB or smaller.");
    chunks.push(chunk);
  }
  if (!size) throw new Error("Choose a file to upload.");
  return Buffer.concat(chunks);
}

const UPLOAD_EXTENSIONS = {
  "application/pdf": ".pdf",
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
};

// Writes through a temporary file to reduce the chance of partial JSON.
async function saveContent(content) {
  const temp = `${CONTENT_FILE}.tmp`;
  await writeFile(temp, `${JSON.stringify(content, null, 2)}\n`, "utf8");
  await rename(temp, CONTENT_FILE);
}

// Adds the legacy local /api routes to the Vite development server.
export function contentApiPlugin(env) {
  return {
    name: "portfolio-content-api",
    configureServer(server) {
      // Handle only /api requests and pass normal assets back to Vite.
      server.middlewares.use(async (req, res, next) => {
        const url = new URL(req.url, "http://local.test");
        if (!url.pathname.startsWith("/api/")) return next();

        try {
          if (req.method === "GET" && url.pathname === "/api/content") {
            const content = JSON.parse(await readFile(CONTENT_FILE, "utf8"));
            return json(res, 200, content);
          }

          if (req.method === "POST" && url.pathname === "/api/auth/login") {
            const ip = req.socket.remoteAddress || "local";
            if (isRateLimited(ip)) return json(res, 429, { error: "Too many attempts. Try again later." });
            const body = await readBody(req);
            const usernameOk = typeof body.username === "string" && body.username === env.ADMIN_USERNAME;
            const passwordOk = typeof body.password === "string" && validPassword(body.password, env.ADMIN_PASSWORD_SCRYPT);
            if (!usernameOk || !passwordOk) {
              recordFailure(ip);
              return json(res, 401, { error: "Invalid username or password." });
            }
            loginAttempts.delete(ip);
            const token = randomBytes(32).toString("base64url");
            const csrf = randomBytes(24).toString("base64url");
            sessions.set(hashToken(token), { csrf, expiresAt: Date.now() + SESSION_TTL });
            return json(res, 200, { authenticated: true, csrf }, {
              "Set-Cookie": `portfolio_session=${encodeURIComponent(token)}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${SESSION_TTL / 1000}`,
            });
          }

          if (req.method === "GET" && url.pathname === "/api/auth/session") {
            const session = getSession(req);
            return json(res, 200, session ? { authenticated: true, csrf: session.csrf } : { authenticated: false });
          }

          if (req.method === "POST" && url.pathname === "/api/auth/logout") {
            const session = getSession(req);
            if (session) sessions.delete(session.key);
            return json(res, 200, { authenticated: false }, {
              "Set-Cookie": "portfolio_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0",
            });
          }

          if (req.method === "PUT" && url.pathname === "/api/content") {
            const session = getSession(req);
            if (!session) return json(res, 401, { error: "Authentication required." });
            if (req.headers["x-csrf-token"] !== session.csrf) return json(res, 403, { error: "Invalid security token." });
            const content = validateContent(await readBody(req));
            await saveContent(content);
            return json(res, 200, { saved: true, content });
          }

          if (req.method === "POST" && url.pathname === "/api/uploads") {
            const session = getSession(req);
            if (!session) return json(res, 401, { error: "Authentication required." });
            if (req.headers["x-csrf-token"] !== session.csrf) return json(res, 403, { error: "Invalid security token." });
            const contentType = (req.headers["content-type"] || "").split(";")[0].toLowerCase();
            const extension = UPLOAD_EXTENSIONS[contentType];
            if (!extension) return json(res, 415, { error: "Only PDF, JPG, PNG, and WebP files are allowed." });
            const file = await readUpload(req);
            await mkdir(UPLOAD_DIR, { recursive: true });
            const filename = `${Date.now()}-${randomBytes(8).toString("hex")}${extension}`;
            await writeFile(path.join(UPLOAD_DIR, filename), file, { flag: "wx" });
            return json(res, 201, { url: `/uploads/${filename}` });
          }

          return json(res, 404, { error: "Not found." });
        } catch (error) {
          return json(res, 400, { error: error.message || "Request failed." });
        }
      });
    },
  };
}
