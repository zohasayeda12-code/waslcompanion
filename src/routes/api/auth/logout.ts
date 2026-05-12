import { createFileRoute } from "@tanstack/react-router";
import { getWaslSession } from "@/lib/qf-session.server";

/**
 * Clears the encrypted session cookie and redirects to /login.
 * POST-only to prevent CSRF-based forced logouts via crafted links.
 */
async function handleLogout(request: Request) {
  const session = await getWaslSession();
  await session.clear();
  const url = new URL(request.url);
  return Response.redirect(new URL("/login", url.origin), 302);
}

export const Route = createFileRoute("/api/auth/logout")({
  server: {
    handlers: {
      POST: async ({ request }) => handleLogout(request),
    },
  },
});
