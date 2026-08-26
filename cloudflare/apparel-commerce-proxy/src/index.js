/**
 * Same-origin commerce edge for the spatial AeroVista Apparel storefront.
 *
 * Static storefront origin remains whatever serves apparel.aerovista.us.
 * Cloudflare intercepts only commerce paths:
 *   apparel.aerovista.us/api/* -> api.aerovista.us/api/*
 *   apparel.aerovista.us/v1/*  -> api.aerovista.us/v1/* (future cutover)
 *   apparel.aerovista.us/square_products_latest.json -> current Gear catalog
 */
const API_ORIGIN = 'https://api.aerovista.us'
const CATALOG_URL = 'https://gear.aerovista.us/square_products_latest.json'

const ALLOWED_ORIGINS = new Set([
  'https://apparel.aerovista.us',
  'https://gear.aerovista.us',
  'http://localhost:5174',
  'http://127.0.0.1:5174',
])

function corsHeaders(origin, extra = {}) {
  const headers = new Headers(extra)
  if (origin && ALLOWED_ORIGINS.has(origin)) {
    headers.set('Access-Control-Allow-Origin', origin)
    headers.set('Access-Control-Allow-Credentials', 'true')
    headers.set('Vary', 'Origin')
  }
  return headers
}

function handleOptions(request) {
  const origin = request.headers.get('Origin') || ''
  return new Response(null, {
    status: 204,
    headers: corsHeaders(origin, {
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS, HEAD',
      'Access-Control-Allow-Headers': 'Content-Type, Accept, Idempotency-Key',
      'Access-Control-Max-Age': '86400',
    }),
  })
}

async function proxyApi(request, url) {
  const origin = request.headers.get('Origin') || ''
  if (request.method === 'OPTIONS') return handleOptions(request)

  const target = `${API_ORIGIN}${url.pathname}${url.search}`
  const headers = new Headers(request.headers)
  headers.set('Host', 'api.aerovista.us')
  headers.delete('cf-connecting-ip')

  const proxyRequest = new Request(target, {
    method: request.method,
    headers,
    body: request.method === 'GET' || request.method === 'HEAD' ? undefined : request.body,
    redirect: 'follow',
  })
  const upstream = await fetch(proxyRequest)
  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: corsHeaders(origin, upstream.headers),
  })
}

async function proxyCatalog(request) {
  if (!['GET', 'HEAD'].includes(request.method)) {
    return new Response('Method Not Allowed', { status: 405, headers: { Allow: 'GET, HEAD' } })
  }
  const upstream = await fetch(CATALOG_URL, {
    method: request.method,
    headers: { Accept: 'application/json' },
    cf: { cacheTtl: 60, cacheEverything: true },
  })
  const headers = new Headers(upstream.headers)
  headers.set('Cache-Control', 'public, max-age=60, stale-while-revalidate=300')
  headers.set('X-AeroVista-Catalog-Source', 'gear-production')
  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers,
  })
}

export default {
  async fetch(request) {
    const url = new URL(request.url)
    if (url.pathname === '/square_products_latest.json') return proxyCatalog(request)
    if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/v1/')) return proxyApi(request, url)
    return fetch(request)
  },
}
