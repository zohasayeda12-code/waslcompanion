import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { getAuthStatus } from "@/lib/auth.functions";
import { getProfile } from "@/lib/profile.functions";
import { BottomNav } from "@/components/bottom-nav";

function AuthenticatedShell() {
  return (
    <>
      <Outlet />
      <BottomNav />
    </>
  );
}

export const Route = createFileRoute("/_authenticated")({
  // Cache auth + profile in the query client so subsequent navigations between
  // authenticated tabs (Home, Quran, My Ayahs, Settings) are an instant cache
  // hit instead of two sequential server RPCs every time.
  beforeLoad: async ({ location, context }) => {
    const { queryClient } = context;
    const status = await queryClient.ensureQueryData({
      queryKey: ["auth-status"],
      queryFn: () => getAuthStatus(),
      staleTime: 60_000,
    });
    if (!status.isAuthenticated) {
      throw redirect({
        to: "/login",
        search: { redirect: location.pathname, configured: status.configured },
      });
    }
    if (!location.pathname.startsWith("/onboarding")) {
      const profile = await queryClient.ensureQueryData({
        queryKey: ["profile"],
        queryFn: () => getProfile(),
        staleTime: 5 * 60_000,
      });
      if (!profile?.onboarded_at) {
        throw redirect({ to: "/onboarding" });
      }
    }
    return { auth: status };
  },
  component: AuthenticatedShell,
});
