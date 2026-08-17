import { z } from "zod";

import { AppError } from "@/lib/errors";
import { err, ok, type Result } from "@/lib/result";

const EVIDENCE_PATH_PREFIX = "/comprovantes/";
const INVALID_EVIDENCE_URL = "URL de comprovante inválida.";
const INVALID_HTTP_URL = "URL inválida.";

function hasUnsafeCharacters(value: string): boolean {
  return /[\u0000-\u0020\u007f\\]/.test(value);
}

function isSafeRelativeEvidencePath(value: string): boolean {
  if (
    hasUnsafeCharacters(value) ||
    !value.startsWith(EVIDENCE_PATH_PREFIX) ||
    value.startsWith("//")
  ) {
    return false;
  }

  let decoded: string;

  try {
    decoded = decodeURIComponent(value);
  } catch {
    return false;
  }

  if (
    hasUnsafeCharacters(decoded) ||
    decoded.startsWith("//") ||
    !decoded.startsWith(EVIDENCE_PATH_PREFIX)
  ) {
    return false;
  }

  const path = decoded.split(/[?#]/, 1)[0] ?? "";
  const segments = path.split("/");

  return !segments.some((segment) => segment === "." || segment === "..");
}

function canonicalizeHttpUrl(value: string): string | null {
  try {
    const url = new URL(value);

    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return null;
    }

    if (!url.hostname || url.username || url.password) {
      return null;
    }

    return url.toString();
  } catch {
    return null;
  }
}

export function parseSafeHttpUrl(value: string): Result<string> {
  const canonical = canonicalizeHttpUrl(value.trim());

  if (!canonical) {
    return err(new AppError("INVALID_INPUT", INVALID_HTTP_URL));
  }

  return ok(canonical);
}

export function parseSafeEvidenceUrl(value: string): Result<string> {
  const trimmed = value.trim();

  if (!trimmed) {
    return err(new AppError("INVALID_INPUT", INVALID_EVIDENCE_URL));
  }

  if (trimmed.startsWith("/")) {
    if (isSafeRelativeEvidencePath(trimmed)) {
      return ok(trimmed);
    }

    return err(new AppError("INVALID_INPUT", INVALID_EVIDENCE_URL));
  }

  const absolute = canonicalizeHttpUrl(trimmed);

  if (!absolute) {
    return err(new AppError("INVALID_INPUT", INVALID_EVIDENCE_URL));
  }

  return ok(absolute);
}

export const evidenceUrlSchema = z
  .string()
  .trim()
  .min(1)
  .refine((value) => parseSafeEvidenceUrl(value).ok, {
    message: INVALID_EVIDENCE_URL,
  });
