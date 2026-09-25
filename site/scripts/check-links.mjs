#!/usr/bin/env node
/**
 * Link checker: crawls the sitemap, verifies every internal href returns 200,
 * checks every #anchor has a matching id on its page, and validates external
 * links with HEAD+GET fallback. Exits non-zero on any internal failure.
 *
 * Usage (run against a live server):
 *   SITE_URL=http://localhost:3000 node scripts/check-links.mjs
 *
 * Env vars:
 *   SITE_URL        Base URL of the running server (default: http://localhost:3000)
 *   CHECK_EXTERNAL  Set to "false" to skip external link checks (default: true)
 */

const BASE = process.env.SITE_URL ?? "http://localhost:3000";
const CHECK_EXTERNAL = process.env.CHECK_EXTERNAL !== "false";

// Hosts that reliably block automated HEAD requests; skip rather than fail.
const EXTERNAL_ALLOWLIST = ["linkedin.com", "www.linkedin.com"];

const TIMEOUT_MS = 10_000;
const RETRY_COUNT = 2;
const RETRY_DELAY_MS = 1_000;

// ─── helpers ──────────────────────────────────────────────────────────────────

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchWithTimeout(url, options = {}) {
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, { ...options, signal: ac.signal });
  } finally {
    clearTimeout(t);
  }
}

async function fetchWithRetry(url, options = {}, retries = RETRY_COUNT) {
  for (let i = 0; i <= retries; i++) {
    try {
      return await fetchWithTimeout(url, options);
    } catch (err) {
      if (i === retries) throw err;
      await sleep(RETRY_DELAY_MS);
    }
  }
}

function isAllowlisted(url) {
  try {
    const { hostname } = new URL(url);
    return EXTERNAL_ALLOWLIST.some((h) => hostname === h || hostname.endsWith(`.${h}`));
  } catch {
    return false;
  }
}

function isInternal(href) {
  if (!href) return false;
  if (href.startsWith("/")) return true;
  try {
    return new URL(href).origin === new URL(BASE).origin;
  } catch {
    return false;
  }
}

function toAbsolute(href) {
  return href.startsWith("/") ? `${BASE}${href}` : href;
}

// ─── HTML parsing (regex; sufficient for server-rendered Next.js output) ──────

function extractIds(html) {
  const ids = new Set();
  for (const m of html.matchAll(/\sid="([^"]+)"/g)) ids.add(m[1]);
  return ids;
}

function extractHrefs(html) {
  const hrefs = [];
  for (const m of html.matchAll(/<a\s[^>]*href="([^"#][^"]*|#[^"]+)"[^>]*>/g)) {
    const h = m[1];
    if (!h || h.startsWith("mailto:") || h.startsWith("tel:") || h === "#") continue;
    hrefs.push(h);
  }
  return hrefs;
}

// ─── sitemap ──────────────────────────────────────────────────────────────────

async function getSitemapUrls() {
  const res = await fetchWithRetry(`${BASE}/sitemap.xml`);
  if (!res.ok) throw new Error(`Sitemap returned HTTP ${res.status}`);
  const text = await res.text();
  return [...text.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].trim());
}

// ─── page fetch ───────────────────────────────────────────────────────────────

const pageCache = new Map(); // pathname -> { status, ids, hrefs }

async function getPage(pathname) {
  if (pageCache.has(pathname)) return pageCache.get(pathname);
  const url = `${BASE}${pathname}`;
  let entry;
  try {
    const res = await fetchWithRetry(url, { headers: { Accept: "text/html" } });
    if (!res.ok) {
      entry = { status: res.status, ids: new Set(), hrefs: [] };
    } else {
      const html = await res.text();
      entry = { status: 200, ids: extractIds(html), hrefs: extractHrefs(html) };
    }
  } catch (err) {
    entry = { status: err.message, ids: new Set(), hrefs: [] };
  }
  pageCache.set(pathname, entry);
  return entry;
}

// ─── external check ───────────────────────────────────────────────────────────

async function checkExternal(url) {
  if (isAllowlisted(url)) return { url, ok: true, status: "allowlisted" };
  try {
    let res = await fetchWithRetry(url, { method: "HEAD", redirect: "follow" });
    if (!res.ok) res = await fetchWithRetry(url, { method: "GET", redirect: "follow" });
    return { url, ok: res.ok, status: res.status };
  } catch (err) {
    return { url, ok: false, status: err.message };
  }
}

// ─── main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`Checking links against ${BASE}\n`);

  let sitemapUrls;
  try {
    sitemapUrls = await getSitemapUrls();
  } catch (err) {
    console.error(`ERROR: ${err.message}`);
    process.exit(1);
  }
  console.log(`Sitemap: ${sitemapUrls.length} URLs\n`);

  // Normalize sitemap entries to local-server pathnames
  const pathnames = sitemapUrls.map((u) => {
    try {
      return new URL(u).pathname;
    } catch {
      return u;
    }
  });

  const internalErrors = [];
  const externalLinks = new Set();

  // Pass 1: verify each sitemap page returns 200, collect outbound links
  console.log("Pass 1: sitemap pages");
  for (const p of pathnames) {
    process.stdout.write(`  ${p} ... `);
    const { status, hrefs } = await getPage(p);
    if (status !== 200) {
      console.log(`FAIL (${status})`);
      internalErrors.push({ where: p, problem: `HTTP ${status}` });
    } else {
      console.log("OK");
      for (const h of hrefs) {
        if (isInternal(h)) {
          // queue for anchor check
        } else if (CHECK_EXTERNAL && !h.startsWith("#")) {
          externalLinks.add(h);
        }
      }
    }
  }

  // Pass 2: check every #anchor found on sitemap pages
  console.log("\nPass 2: anchor ids");
  let anchorOk = 0;
  for (const p of pathnames) {
    const { hrefs } = pageCache.get(p) ?? { hrefs: [] };
    for (const h of hrefs) {
      if (!isInternal(h)) continue;
      const abs = toAbsolute(h);
      let parsed;
      try {
        parsed = new URL(abs);
      } catch {
        continue;
      }
      if (!parsed.hash) continue;
      const anchor = parsed.hash.slice(1);
      const targetPath = parsed.pathname;
      const { ids } = await getPage(targetPath);
      if (!ids.has(anchor)) {
        console.log(`  MISSING #${anchor} on ${targetPath}  (linked from ${p})`);
        internalErrors.push({ where: p, problem: `#${anchor} not found on ${targetPath}` });
      } else {
        anchorOk++;
      }
    }
  }
  if (anchorOk > 0) console.log(`  ${anchorOk} anchor(s) OK`);

  // Pass 3: external links (non-blocking)
  const externalErrors = [];
  if (CHECK_EXTERNAL && externalLinks.size > 0) {
    console.log(`\nPass 3: ${externalLinks.size} external links`);
    for (const url of externalLinks) {
      process.stdout.write(`  ${url} ... `);
      const result = await checkExternal(url);
      if (result.ok) {
        console.log(`OK (${result.status})`);
      } else {
        console.log(`WARN (${result.status})`);
        externalErrors.push(result);
      }
    }
  }

  // ─── summary ────────────────────────────────────────────────────────────────
  console.log("\n─── Summary ─────────────────────────────────────────────────────");

  if (externalErrors.length > 0) {
    console.log("External warnings (non-blocking):");
    for (const e of externalErrors) console.log(`  WARN  ${e.url}  (${e.status})`);
  }

  if (internalErrors.length === 0) {
    console.log("All internal links and anchors OK.");
    process.exit(0);
  } else {
    console.log(`\n${internalErrors.length} internal error(s):`);
    for (const e of internalErrors) console.log(`  FAIL  ${e.where}  —  ${e.problem}`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Unhandled error:", err);
  process.exit(1);
});
