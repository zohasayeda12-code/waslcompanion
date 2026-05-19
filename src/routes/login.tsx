import { createFileRoute, redirect } from "@tanstack/react-router";

type LoginSearch = {
  redirect?: string;
  error?: string;
};

/**
 * Legacy /login route — the onboarding + auth screen now lives at "/".
 * Forward any traffic (including OAuth error redirects) to the root, preserving search params.
 */
export const Route = createFileRoute("/login")({
  validateSearch: (search: Record<string, unknown>): LoginSearch => ({
    redirect:
      typeof search.redirect === "string" && search.redirect.startsWith("/")
        ? search.redirect
        : undefined,
    error: typeof search.error === "string" ? search.error : undefined,
  }),
  beforeLoad: ({ search }) => {
    throw redirect({ to: "/", search });
  },
});
