import { createServerFn } from "@tanstack/react-start";
import { getWaslSession } from "./qf-session.server";
import { isConfigured } from "./qf-config.server";

/**
 * Returns the user's auth status. Safe to call from any loader.
 * Never throws — public-route loaders rely on this returning cleanly.
 */
export const getAuthStatus = createServerFn({ method: "GET" }).handler(
  async () => {
    if (!isConfigured()) {
      return { isAuthenticated: false, configured: false } as const;
    }
    const session = await getWaslSession();
    const token = session.data?.accessToken;
    const expiresAt = session.data?.expiresAt;
    if (!token || (expiresAt && Date.now() > expiresAt)) {
      return { isAuthenticated: false, configured: true } as const;
    }
    return { isAuthenticated: true, configured: true } as const;
  },
);
