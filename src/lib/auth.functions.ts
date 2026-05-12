import { createServerFn } from "@tanstack/react-start";
import { getWaslSession } from "./qf-session.server";
import { isConfigured } from "./qf-config.server";

/**
 * Returns the user's auth status. Safe to call from any loader.
 * Never throws — public-route loaders rely on this returning cleanly.
 */
export const getAuthStatus = createServerFn({ method: "GET" }).handler(async () => {
  // ⚠️ TEMPORARY DEV/HACKATHON BYPASS — remove once QF prelive OAuth is stable.
  // When VITE_BYPASS_AUTH=true, treat every visitor as authenticated so we can
  // keep building protected screens while upstream OAuth is down.
  // Does NOT touch session, token exchange, or OAuth routes.
  if (process.env.VITE_BYPASS_AUTH === "true") {
    return { isAuthenticated: true, configured: true } as const;
  }

  if (!isConfigured()) {
    return { isAuthenticated: false, configured: false } as const;
  }
  console.log("AUTH CHECK: getting session");

  const session = await getWaslSession();

  console.log("AUTH CHECK: session loaded");

  console.log("AUTH CHECK: has access token", !!session.data?.accessToken);

  const token = session.data?.accessToken;
  if (!token) {
    return { isAuthenticated: false, configured: true } as const;
  }
  return { isAuthenticated: true, configured: true } as const;
});
