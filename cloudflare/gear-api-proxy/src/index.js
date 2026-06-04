/**
 * Proxies https://gear.aerovista.us/api/* → https://api.aerovista.us/api/*
 * Fixes browser checkout (CORS) for the static GitHub Pages shop.
 */
const API_ORIGIN = "https://api.aerovista.us";

const ALLOWED_ORIGINS = new Set([
  "https://gear.aerovista.us",
  "https://aerovista-us.github.io",
  "http://localhost:5174",
  "http://127.0.0.1:5174",
]);

function corsHeaders(origin, extra = {}) {
  const h = new Headers(extra);
  if (origin && ALLOWED_ORIGINS.has(origin)) {
    h.set("Access-Control-Allow-Origin", origin);
    h.set("Access-Control-Allow-Credentials", "true");
    h.set("Vary", "Origin");
  }
  return h;
}

function handleOptions(request) {
  const origin = request.headers.get("Origin") || "";
  if (!origin || !ALLOWED_ORIGINS.has(origin)) {
    return new Response(null, { status: 204 });
  }
  return new Response(null, {
    status: 204,
    headers: corsHeaders(origin, {
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Accept",
      "Access-Control-Max-Age": "86400",
    }),
  });
}

export default {
  async fetch(request) {
    const url = new URL(request.url);
    if (!url.pathname.startsWith("/api/")) {
      return fetch(request);
    }

    const origin = request.headers.get("Origin") || "";

    if (request.method === "OPTIONS") {
      return handleOptions(request);
    }

    const target = `${API_ORIGIN}${url.pathname}${url.search}`;
    const headers = new Headers(request.headers);
    headers.set("Host", "api.aerovista.us");
    headers.delete("cf-connecting-ip");

    const proxyReq = new Request(target, {
      method: request.method,
      headers,
      body: request.method === "GET" || request.method === "HEAD" ? undefined : request.body,
      redirect: "follow",
    });

    const upstream = await fetch(proxyReq);
    const outHeaders = corsHeaders(origin, upstream.headers);
    return new Response(upstream.body, {
      status: upstream.status,
      statusText: upstream.statusText,
      headers: outHeaders,
    });
  },
};
