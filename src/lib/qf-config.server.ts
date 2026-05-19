/**
 * Quran.Foundation OAuth configuration.
 * Reads at call time (not module load) so secret rotations apply immediately.
 *
 * Required env (set via Lovable secrets):
 *   QF_CLIENT_ID        - OAuth client ID from Quran.Foundation
 *   QF_CLIENT_SECRET    - OAuth client secret
 *   SESSION_SECRET      - 32+ char string used to encrypt session cookies
 *
 * Optional env (sensible defaults):
 *   QF_AUTH_URL         - Authorization endpoint
 *   QF_TOKEN_URL        - Token endpoint
 *   QF_SCOPES           - Space-separated scopes
 *   QF_REDIRECT_URI     - Override callback URL (otherwise derived from request origin)
 */

export const qfConfig = {
  get clientId() {
    return process.env.QF_CLIENT_ID ?? "";
  },
  get clientSecret() {
    return process.env.QF_CLIENT_SECRET ?? "";
  },
  get authUrl() {
    return process.env.QF_AUTH_URL ?? "https://prelive-oauth2.quran.foundation/oauth2/auth";
  },
  get tokenUrl() {
    return process.env.QF_TOKEN_URL ?? "https://prelive-oauth2.quran.foundation/oauth2/token";
  },
  get userInfoUrl() {
    return process.env.QF_USERINFO_URL ?? `${new URL(this.authUrl).origin}/userinfo`;
  },
  get scopes() {
    return (
      process.env.QF_SCOPES ??
      "openid profile offline_access bookmark collection post"
    );
  },
  /**
   * Base URL for Quran.Foundation User APIs (bookmarks, collections, posts).
   * Defaults to prelive to match the default auth URL.
   */
  get userApiUrl() {
    return process.env.QF_USER_API_BASE_URL ?? "https://apis-prelive.quran.foundation";
  },
};

export function getRedirectUri(origin: string): string {
  return process.env.QF_REDIRECT_URI ?? `${origin}/oauth/callback`;
}

export function isConfigured(): boolean {
  return (
    !!qfConfig.clientId &&
    !!qfConfig.clientSecret &&
    !!process.env.SESSION_SECRET &&
    (process.env.SESSION_SECRET?.length ?? 0) >= 32
  );
}
