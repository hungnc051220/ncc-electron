import { createHash } from "crypto";

// Hash only scripts from our trusted, local build output. Never pass API/user HTML here.
// Used by both the HTML build and the LAN server so their policies stay in sync.
export const getScheduleContentSecurityPolicy = (html = "") => {
  const hashes = Array.from(html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi))
    .filter((match) => !/(?:^|\s)src\s*=/i.test(match[1]) && match[2].trim())
    .map((match) => {
      const source = match[2].replace(/\r\n?/g, "\n");
      return `'sha256-${createHash("sha256").update(source).digest("base64")}'`;
    });

  return [
    "default-src 'self'",
    ["script-src 'self'", ...new Set(hashes)].join(" "),
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "connect-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "frame-ancestors 'none'"
  ].join("; ");
};
