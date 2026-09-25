/** @type {import('next').NextConfig} */

/*
 * Security headers rationale
 * --------------------------
 * X-Content-Type-Options: prevents MIME-type sniffing.
 * Referrer-Policy: sends full referrer for same-origin, only origin for cross-origin.
 * X-Frame-Options + CSP frame-ancestors: belt-and-suspenders clickjacking protection.
 *   X-Frame-Options is for older browsers; frame-ancestors is for modern ones.
 * Permissions-Policy: denies camera, microphone, geolocation unless this site
 *   explicitly calls them (it does not).
 *
 * What we deliberately omit:
 * - A full script-src CSP: Next.js 14 static generation embeds inline scripts for
 *   hydration and chunk loading. framer-motion injects dynamic styles. Enforcing
 *   script-src 'none' or 'strict' requires per-request nonces (incompatible with
 *   static output) or a large hash allowlist that must be regenerated on every build.
 *   The practical choice for a statically exported Next.js site is frame-ancestors only.
 * - X-XSS-Protection: deprecated; browsers ignore it or can introduce
 *   vulnerabilities when set to mode=block.
 */
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
];

const nextConfig = {
  reactStrictMode: true,
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
