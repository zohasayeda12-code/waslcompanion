import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { fetchAyah, searchQuranContent } from "./qf-content.server";

const AyahInput = z.object({
  surah: z.number().int().min(1).max(114),
  ayah: z.number().int().min(1),
  includeTafsir: z.boolean().optional(),
});

export const getAyah = createServerFn({ method: "GET" })
  .inputValidator((d) => AyahInput.parse(d))
  .handler(async ({ data }) => {
    return fetchAyah(data.surah, data.ayah, { includeTafsir: data.includeTafsir });
  });

export const searchQuran = createServerFn({ method: "GET" })
  .inputValidator((d) => z.object({ q: z.string().min(1).max(200) }).parse(d))
  .handler(async ({ data }) => {
    return { results: await searchQuranContent(data.q) };
  });
