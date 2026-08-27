import "server-only";

import { readFile } from "node:fs/promises";
import path from "node:path";

export interface ReferencePageMarkup {
  readonly bodyClassName: string;
  readonly html: string;
  readonly headStyles: readonly string[];
}

const REFERENCE_FILES = new Set(["index.html", "404.html", "verify-email.html", "admin.html"]);

function getReferenceFilePath(fileName: string): string {
  if (!REFERENCE_FILES.has(fileName)) {
    throw new Error("Unsupported reference page.");
  }
  const workingDirectory = path.basename(process.cwd()).toLowerCase() === "frontend"
    ? process.cwd()
    : path.join(process.cwd(), "frontend");
  return path.join(workingDirectory, "public", "reference", fileName);
}

function rewriteReferenceAssetPaths(markup: string): string {
  return markup.replace(
    /((?:src|href)=["'])(?:\/|\.\/)?((?:IMG|CSS|JS)\/)/g,
    "$1/reference/$2",
  );
}

/** Splash-state tokens stripped from served body class names. */
const SPLASH_BODY_CLASS_TOKENS = new Set([
  "splash-active",
  "splash-revealing",
  "splash-complete",
]);

/**
 * Tenant storefronts never run the legacy splash controller, but the shipped
 * overlay uses position:fixed with z-index:99999 and stays visible until
 * client JavaScript hides it — flashing for about a second before hydration.
 * Stripping the section from the served markup guarantees tenants never
 * render it at any point, while the standalone /reference site is unchanged.
 */
function stripSplashScreen(bodyHtml: string): string {
  const start = bodyHtml.indexOf("<!-- ========== SPLASH SCREEN");
  if (start === -1) return bodyHtml;
  // The splash section ends exactly where the site shell begins.
  const end = bodyHtml.indexOf('<div class="site-shell"', start);
  if (end === -1) return bodyHtml;
  return bodyHtml.slice(0, start) + bodyHtml.slice(end);
}

function getSanitizedBodyClassName(className = "") {
  return className
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token !== "" && !SPLASH_BODY_CLASS_TOKENS.has(token))
    .join(" ");
}

export async function getReferencePageMarkup(
  fileName: string,
): Promise<ReferencePageMarkup> {
  const source = await readFile(getReferenceFilePath(fileName), "utf8");
  const bodyMatch = source.match(/<body([^>]*)>([\s\S]*?)<\/body>/i);
  if (!bodyMatch) throw new Error("Reference page does not contain a body.");

  const headStyles = Array.from(
    source.matchAll(/<style(?:\s[^>]*)?>([\s\S]*?)<\/style>/gi),
    (match) => match[1] ?? "",
  );
  const bodyAttributes = bodyMatch[1] ?? "";
  const classMatch = bodyAttributes.match(/class=["']([^"']*)["']/i);

  return {
    bodyClassName: getSanitizedBodyClassName(classMatch?.[1] ?? ""),
    html: rewriteReferenceAssetPaths(stripSplashScreen(bodyMatch[2] ?? "")),
    headStyles,
  };
}

export async function getReferenceSalonMarkup(): Promise<ReferencePageMarkup> {
  return getReferencePageMarkup("index.html");
}

