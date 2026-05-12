import { useSession } from "@tanstack/react-start/server";

/**
 * Encrypted, httpOnly session cookie. Tokens NEVER leave the server.
 * The browser only ever sees an opaque encrypted cookie.
 */
export type WaslSession = {
  accessToken?: string;
  refreshToken?: string;
  tokenType?: string;
  /** Absolute expiry in ms-epoch. */
  expiresAt?: number;
};

export function getWaslSession() {
  const password = process.env.SESSION_SECRET;
  if (!password || password.length < 32) {
    throw new Error(
      "SESSION_SECRET must be set to a value of at least 32 characters."
    );
  }
  return useSession<WaslSession>({
    password,
    name: "wasl_session",
    maxAge: 60 * 60 * 24 * 30, // 30 days
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
    },
  });
}
