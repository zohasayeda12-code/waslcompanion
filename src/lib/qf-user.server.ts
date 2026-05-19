/**
 * Low-level Quran.Foundation User API client.
 *
 * All requests use the access token from the encrypted session cookie.
 * Tokens never leave the server — the browser only sees the opaque cookie.
 *
 * Authentication headers (per QF docs):
 *   x-auth-token: <access_token>
 *   x-client-id:  <QF_CLIENT_ID>
 *
 * Base path is configurable; defaults to the prelive User API host.
 * The user-related endpoints live under `/auth/v1/...`.
 */
import { qfConfig } from "./qf-config.server";
import { getWaslSession } from "./qf-session.server";

export class QFAuthError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "QFAuthError";
  }
}

/**
 * Performs an authenticated request against the QF User API.
 * Returns the raw Response so callers can branch on status.
 */
export async function qfUserFetch(path: string, init?: RequestInit): Promise<Response> {
  const session = await getWaslSession();
  const token = session.data?.accessToken;
  if (!token) throw new QFAuthError(401, "no_access_token");
  if (!qfConfig.clientId) throw new QFAuthError(500, "qf_client_id_missing");

  const url = path.startsWith("http") ? path : `${qfConfig.userApiUrl}${path}`;
  return fetch(url, {
    ...init,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "x-auth-token": token,
      "x-client-id": qfConfig.clientId,
      ...(init?.headers ?? {}),
    },
  });
}

/** Convenience: parse JSON and throw on non-OK. */
export async function qfUserJson<T = any>(path: string, init?: RequestInit): Promise<T> {
  const res = await qfUserFetch(path, init);
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new QFAuthError(res.status, `${res.status} ${body.slice(0, 200)}`);
  }
  return (await res.json()) as T;
}
