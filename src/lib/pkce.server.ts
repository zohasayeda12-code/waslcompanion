import crypto from "node:crypto";

/** OAuth 2.0 PKCE helpers (RFC 7636). All values base64url-encoded. */

export function generateVerifier(): string {
  // 32 bytes => 43-char base64url string (within 43..128 spec range).
  return crypto.randomBytes(32).toString("base64url");
}

export function generateState(): string {
  return crypto.randomBytes(16).toString("base64url");
}

export function challengeFromVerifier(verifier: string): string {
  return crypto.createHash("sha256").update(verifier).digest("base64url");
}
