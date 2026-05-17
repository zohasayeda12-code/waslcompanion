import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { getAuthStatus } from "@/lib/auth.functions";
import { getProfile } from "@/lib/profile.functions";
import { BottomNav } from "@/components/bottom-nav";
import { SideRail } from "@/components/side-rail";

export const Route = createFileRoute("/_authenticated")({
  beforeLoad: async ({ location }) => {
    const status = await getAuthStatus();
    if (!status.isAuthenticated) {
      throw redirect({
        to: "/login",
        search: { redirect: location.pathname, configured: status.configured },
      });
    }
    if (!location.pathname.startsWith("/onboarding")) {
      const profile = await getProfile();
      if (!profile?.onboarded_at) {
        throw redirect({ to: "/onboarding" });
      }
    }
    return { auth: status };
  },
  component: () => (
    <>
      <Outlet />
      <BottomNav />
    </>
  ),
});
