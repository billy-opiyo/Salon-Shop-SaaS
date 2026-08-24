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
  return path.join(process.cwd(), "frontend", "public", "reference", fileName);
}

function rewriteReferenceAssetPaths(markup: string): string {
  return markup.replace(
    /((?:src|href)=["'])(?:\/|\.\/)?((?:IMG|CSS|JS)\/)/g,
    "$1/reference/$2",
  );
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
    bodyClassName: classMatch?.[1] ?? "",
    html: rewriteReferenceAssetPaths(bodyMatch[2] ?? ""),
    headStyles,
  };
}

export async function getReferenceSalonMarkup(): Promise<ReferencePageMarkup> {
  return getReferencePageMarkup("index.html");
}

