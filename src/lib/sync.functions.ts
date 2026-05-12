import { createServerFn } from "@tanstack/react-start";
import { requireUserId } from "./current-user.server";
import {
  getSyncStatusFor,
  kickoffInitialSyncIfNeeded,
  runManualRefresh as runManualRefreshImpl,
} from "./sync.server";

export const kickoffInitialSync = createServerFn({ method: "POST" }).handler(async () => {
  const userId = await requireUserId();
  await kickoffInitialSyncIfNeeded(userId);
  return { ok: true };
});

export const getSyncStatus = createServerFn({ method: "GET" }).handler(async () => {
  const userId = await requireUserId();
  return getSyncStatusFor(userId);
});

export const refreshFromQuranCom = createServerFn({ method: "POST" }).handler(async () => {
  const userId = await requireUserId();
  return runManualRefreshImpl(userId);
});
