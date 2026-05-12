import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { getAuthStatus } from "@/lib/auth.functions";

/**
 * Pathless layout route that guards every child route under /_authenticated/*.
 *
 * `beforeLoad` runs on the server during SSR/preload AND on client navigations,
 * before any component renders — so there's no flash of protected content
 * and no auth race conditions.
 */
export const Route = createFileRoute("/_authenticated")({
  beforeLoad: async ({ location }) => {
    const status = await getAuthStatus();
    if (!status.isAuthenticated && !import.meta.env.DEV) {
      throw redirect({
        to: "/login",
        search: {
          redirect: location.pathname,
          configured: status.configured,
        },
      });
    }
    return { auth: status };
  },
  component: () => <Outlet />,
});
