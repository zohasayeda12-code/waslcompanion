import { createFileRoute, redirect, Outlet } from "@tanstack/react-router";
import { getJourneyState } from "@/lib/journey.functions";

export const Route = createFileRoute("/_authenticated/quran")({
  beforeLoad: async ({ location }) => {
    // Only redirect when the user lands exactly on /quran.
    // Children like /quran/page/$page must pass through untouched,
    // otherwise the parent's redirect creates an infinite loop and
    // the child component never mounts.
    if (location.pathname.replace(/\/$/, "") !== "/quran") return;

    let page = 1;
    try {
      const state = (await Promise.race([
        getJourneyState(),
        new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), 1500)),
      ])) as any;
      if (state?.last_mushaf_page) page = state.last_mushaf_page;
    } catch {
      // fall back to page 1 — never block navigation
    }
    throw redirect({ to: "/quran/page/$page", params: { page: String(page) } });
  },
  component: () => <Outlet />,
});
