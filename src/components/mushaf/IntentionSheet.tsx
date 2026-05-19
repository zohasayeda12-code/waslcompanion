import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { listIntentionsForAyah } from "@/lib/intentions.functions";

type Props = {
  surah: number;
  ayah: number;
  onClose: () => void;
};

const STATUS_LABEL: Record<string, string> = {
  pending: "Active",
  awaiting_response: "Awaiting response",
  carried: "Carrying forward",
  paused: "Paused",
  lived: "Lived",
  removed: "Removed",
};

function formatReminderDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "your selected time";
  return date.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  });
}

export function IntentionSheet({ surah, ayah, onClose }: Props) {
  const listFn = useServerFn(listIntentionsForAyah);
  const { data: intentions = [], isLoading } = useQuery({
    queryKey: ["intentions", surah, ayah],
    queryFn: () => listFn({ data: { surah, ayah } }),
  });

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
      >
        <motion.div
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ type: "spring", damping: 30, stiffness: 280 }}
          onClick={(e) => e.stopPropagation()}
          className="absolute inset-x-0 bottom-0 max-h-[80vh] overflow-y-auto rounded-t-3xl border-t border-border/60 bg-popover p-5 pb-[max(env(safe-area-inset-bottom),1rem)] shadow-[var(--shadow-floating)]"
        >
          <header className="flex items-center justify-between">
            <h3 className="text-base font-medium">Live · {surah}:{ayah}</h3>
            <button
              onClick={onClose}
              aria-label="Close"
              className="interactive inline-flex size-8 items-center justify-center rounded-full bg-secondary/60"
            >
              <X className="size-4" />
            </button>
          </header>

          {isLoading ? (
            <p className="mt-6 text-sm text-muted-foreground">Loading…</p>
          ) : intentions.length === 0 ? (
            <div className="mt-8 flex flex-col items-center text-center">
              <p className="text-sm text-muted-foreground">No intention yet.</p>
              <Link
                to="/live/$surah/$ayah"
                params={{ surah: String(surah), ayah: String(ayah) }}
                className="interactive mt-4 rounded-full bg-primary px-4 py-2 text-sm text-primary-foreground"
                onClick={onClose}
              >
                Live this ayah
              </Link>
            </div>
          ) : (
            <ul className="mt-4 space-y-3">
              {intentions.map((i: any) => (
                <li
                  key={i.id}
                  className="rounded-2xl border border-border/60 bg-card/60 p-3"
                >
                  <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                    <span>{STATUS_LABEL[i.status] ?? i.status}</span>
                    <span>{i.kind === "ai" ? "Suggested" : "Custom"}</span>
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-foreground/90">{i.text}</p>
                  <div className="mt-2 flex flex-wrap gap-3 text-[11px] text-muted-foreground">
                    {i.reminder_at && (
                      <span>
                        Reminder:{" "}
                        {formatReminderDate(i.reminder_at)}
                      </span>
                    )}
                    {i.lived_at && (
                      <span>Lived {new Date(i.lived_at).toLocaleDateString()}</span>
                    )}
                    {i.carry_forward_count > 0 && <span>Carried {i.carry_forward_count}×</span>}
                  </div>
                </li>
              ))}
              <Link
                to="/live/$surah/$ayah"
                params={{ surah: String(surah), ayah: String(ayah) }}
                className="interactive block rounded-full bg-secondary px-4 py-2 text-center text-sm"
                onClick={onClose}
              >
                Set a new intention
              </Link>
            </ul>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
