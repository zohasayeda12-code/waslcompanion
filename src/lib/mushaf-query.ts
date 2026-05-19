import { queryOptions } from "@tanstack/react-query";
import { getMushafPage } from "./qf-content.functions";

export const mushafPageQueryOptions = (page: number) =>
  queryOptions({
    queryKey: ["mushaf-page", page],
    queryFn: () => getMushafPage({ data: { page } }),
    staleTime: 60 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: 1,
  });
