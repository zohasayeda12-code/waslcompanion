import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { generateAyahContext } from "./ayah-context.server";
import { requireUserId } from "./current-user.server";

const Input = z.object({
  surah: z.number().int().min(1).max(114),
  ayah: z.number().int().min(1),
});

export const getAyahContext = createServerFn({ method: "GET" })
  .inputValidator((d) => Input.parse(d))
  .handler(async ({ data }) => {
    await requireUserId();
    return generateAyahContext(data.surah, data.ayah);
  });
