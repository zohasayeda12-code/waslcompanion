import { createFileRoute, redirect } from "@tanstack/react-router";
import { getJourneyState } from "@/lib/journey.functions";

export const Route = createFileRoute("/_authenticated/quran")({
  beforeLoad: async () => {
    const state = await getJourneyState();
    const page = state?.last_mushaf_page ?? 1;
    throw redirect({ to: "/quran/page/$page", params: { page: String(page) } });
  },
});
