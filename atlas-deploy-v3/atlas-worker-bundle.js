// Minimal static-serving Worker for finitebuilds.com (GLI).
//
// Replaces the decommissioned Atlas SSR SPA (2026-07-30 decommission). This
// Worker does three things and nothing else:
//   1. 301-redirects the dead Atlas routes (/cities, /sectors, /watchlist,
//      /research, /assessment*) to the new homepage, so none of the old
//      empty Atlas screens or their claims are reachable behind the site.
//   2. Serves the static GLI homepage + dossier from [assets] (env.ASSETS).
//   3. Stamps the site's security response headers on every response.
//
// No API. No backend. No external fetches. Nothing on gli-backbone is exposed.
// The CSP below is copied verbatim from the pre-existing `_headers` file — it is
// intentionally left unchanged (the api.finitebuilds.com connect-src entry is
// dead but harmless; changing the CSP is out of scope for this replacement).

const SECURITY_HEADERS = {
  "X-Frame-Options": "DENY",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  "Content-Security-Policy":
    "default-src 'self'; script-src 'self' 'unsafe-inline' https://cdn.tailwindcss.com https://cdn.jsdelivr.net https://fonts.googleapis.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://fonts.gstatic.com; font-src 'self' https://fonts.gstatic.com; connect-src 'self' https://api.finitebuilds.com; img-src 'self' data:; frame-src 'none';",
};

// Dead Atlas SPA routes. Exact matches plus any deeper path under them
// (e.g. /cities/philadelphia, /assessment/new) all 301 to the homepage.
const REDIRECT_EXACT = new Set([
  "/cities",
  "/sectors",
  "/watchlist",
  "/research",
  "/assessment",
]);
const REDIRECT_PREFIXES = [
  "/cities/",
  "/sectors/",
  "/watchlist/",
  "/research/",
  "/assessment/",
];

function withSecurityHeaders(res) {
  const out = new Response(res.body, res);
  for (const [k, v] of Object.entries(SECURITY_HEADERS)) {
    out.headers.set(k, v);
  }
  return out;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    // Normalise a single trailing slash for the exact-match check.
    const path = url.pathname.length > 1
      ? url.pathname.replace(/\/+$/, "")
      : url.pathname;

    const isDeadAtlasRoute =
      REDIRECT_EXACT.has(path) ||
      REDIRECT_PREFIXES.some((p) => url.pathname.startsWith(p));

    if (isDeadAtlasRoute) {
      return withSecurityHeaders(
        new Response(null, { status: 301, headers: { Location: "/" } })
      );
    }

    // Everything else is served from the static assets. env.ASSETS.fetch
    // applies html_handling (so "/" -> index.html) and not_found_handling.
    const assetResponse = await env.ASSETS.fetch(request);
    return withSecurityHeaders(assetResponse);
  },
};
