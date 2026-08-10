const encoder = new TextEncoder();
const SESSION_TTL_SECONDS = 8 * 60 * 60;
const MAX_UPLOAD_SIZE = 10 * 1024 * 1024;
const UPLOAD_EXTENSIONS = {
  "application/pdf": ".pdf",
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
};

function json(payload, status = 200, headers = {}) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...headers },
  });
}

function bytesToBase64Url(bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlToText(value) {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((value.length + 3) % 4);
  return atob(padded);
}

async function digest(value) {
  return new Uint8Array(await crypto.subtle.digest("SHA-256", encoder.encode(value)));
}

function safeEqual(left, right) {
  if (left.length !== right.length) return false;
  let mismatch = 0;
  for (let index = 0; index < left.length; index += 1) mismatch |= left[index] ^ right[index];
  return mismatch === 0;
}

async function sign(value, secret) {
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return bytesToBase64Url(new Uint8Array(await crypto.subtle.sign("HMAC", key, encoder.encode(value))));
}

function readCookie(request, name) {
  const cookie = request.headers.get("cookie") || "";
  const match = cookie.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.slice(name.length + 1)) : "";
}

async function readSession(request, env) {
  const token = readCookie(request, "portfolio_session");
  if (!token || !env.ADMIN_SESSION_SECRET) return null;
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;
  const expected = await sign(payload, env.ADMIN_SESSION_SECRET);
  if (!safeEqual(encoder.encode(signature), encoder.encode(expected))) return null;
  try {
    const session = JSON.parse(base64UrlToText(payload));
    return session.exp > Date.now() ? session : null;
  } catch {
    return null;
  }
}

async function ensureContentTable(db) {
  await db.prepare(`CREATE TABLE IF NOT EXISTS portfolio_content (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    content_json TEXT NOT NULL,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`).run();
}

async function getContent(request, env) {
  await ensureContentTable(env.DB);
  const saved = await env.DB.prepare("SELECT content_json FROM portfolio_content WHERE id = 1").first();
  if (saved?.content_json) return JSON.parse(saved.content_json);
  const seedUrl = new URL("/content.json", request.url);
  const seedResponse = await env.ASSETS.fetch(new Request(seedUrl));
  if (!seedResponse.ok) throw new Error("Portfolio content seed is unavailable.");
  const content = await seedResponse.json();
  await env.DB.prepare("INSERT INTO portfolio_content (id, content_json) VALUES (1, ?)").bind(JSON.stringify(content)).run();
  return content;
}

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

async function handleApi(request, env, url) {
  if (request.method === "GET" && url.pathname === "/api/content") {
    return json(await getContent(request, env));
  }

  if (request.method === "POST" && url.pathname === "/api/auth/login") {
    if (!env.ADMIN_USERNAME || !env.ADMIN_PASSWORD || !env.ADMIN_SESSION_SECRET) return json({ error: "Admin is not configured." }, 503);
    const body = await request.json();
    const usernameOk = safeEqual(await digest(String(body.username || "")), await digest(env.ADMIN_USERNAME));
    const passwordOk = safeEqual(await digest(String(body.password || "")), await digest(env.ADMIN_PASSWORD));
    if (!usernameOk || !passwordOk) return json({ error: "Invalid username or password." }, 401);
    const csrf = bytesToBase64Url(crypto.getRandomValues(new Uint8Array(24)));
    const payload = bytesToBase64Url(encoder.encode(JSON.stringify({ csrf, exp: Date.now() + SESSION_TTL_SECONDS * 1000 })));
    const signature = await sign(payload, env.ADMIN_SESSION_SECRET);
    return json({ authenticated: true, csrf }, 200, {
      "set-cookie": `portfolio_session=${encodeURIComponent(`${payload}.${signature}`)}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${SESSION_TTL_SECONDS}`,
    });
  }

  if (request.method === "GET" && url.pathname === "/api/auth/session") {
    const session = await readSession(request, env);
    return json(session ? { authenticated: true, csrf: session.csrf } : { authenticated: false });
  }

  if (request.method === "POST" && url.pathname === "/api/auth/logout") {
    return json({ authenticated: false }, 200, { "set-cookie": "portfolio_session=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0" });
  }

  if (request.method === "PUT" && url.pathname === "/api/content") {
    const session = await readSession(request, env);
    if (!session) return json({ error: "Authentication required." }, 401);
    if (request.headers.get("x-csrf-token") !== session.csrf) return json({ error: "Invalid security token." }, 403);
    const content = validateContent(await request.json());
    await ensureContentTable(env.DB);
    await env.DB.prepare(`INSERT INTO portfolio_content (id, content_json, updated_at) VALUES (1, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(id) DO UPDATE SET content_json = excluded.content_json, updated_at = CURRENT_TIMESTAMP`).bind(JSON.stringify(content)).run();
    return json({ saved: true, content });
  }

  if (request.method === "POST" && url.pathname === "/api/uploads") {
    const session = await readSession(request, env);
    if (!session) return json({ error: "Authentication required." }, 401);
    if (request.headers.get("x-csrf-token") !== session.csrf) return json({ error: "Invalid security token." }, 403);
    const contentType = (request.headers.get("content-type") || "").split(";")[0].toLowerCase();
    const extension = UPLOAD_EXTENSIONS[contentType];
    if (!extension) return json({ error: "Only PDF, JPG, PNG, and WebP files are allowed." }, 415);
    const statedSize = Number(request.headers.get("content-length") || 0);
    if (statedSize > MAX_UPLOAD_SIZE) return json({ error: "File must be 10 MB or smaller." }, 413);
    const bytes = await request.arrayBuffer();
    if (!bytes.byteLength) return json({ error: "Choose a file to upload." }, 400);
    if (bytes.byteLength > MAX_UPLOAD_SIZE) return json({ error: "File must be 10 MB or smaller." }, 413);
    const random = bytesToBase64Url(crypto.getRandomValues(new Uint8Array(12)));
    const key = `${Date.now()}-${random}${extension}`;
    await env.FILES.put(key, bytes, { httpMetadata: { contentType } });
    return json({ url: `/uploads/${key}` }, 201);
  }

  return json({ error: "Not found." }, 404);
}

async function handleUpload(request, env, url) {
  const staticResponse = await env.ASSETS.fetch(request);
  if (staticResponse.status !== 404) return staticResponse;
  if (!env.FILES) return staticResponse;
  const object = await env.FILES.get(decodeURIComponent(url.pathname.slice("/uploads/".length)));
  if (!object) return new Response("Not found", { status: 404 });
  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("etag", object.httpEtag);
  headers.set("cache-control", "public, max-age=3600");
  return new Response(object.body, { headers });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    try {
      if (url.pathname.startsWith("/api/")) return await handleApi(request, env, url);
      if (request.method === "GET" && url.pathname.startsWith("/uploads/")) return await handleUpload(request, env, url);

      const response = await env.ASSETS.fetch(request);
      const acceptsHtml = request.headers.get("accept")?.includes("text/html");
      if (response.status !== 404 || !acceptsHtml || !["GET", "HEAD"].includes(request.method)) return response;

      const indexUrl = new URL(request.url);
      indexUrl.pathname = "/index.html";
      indexUrl.search = "";
      return env.ASSETS.fetch(new Request(indexUrl, request));
    } catch (error) {
      return json({ error: error?.message || "Request failed." }, 500);
    }
  },
};
