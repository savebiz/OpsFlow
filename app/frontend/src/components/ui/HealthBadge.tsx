import { clsx } from "clsx";

export type HealthStatus = "Green" | "Yellow" | "Red";

export const HealthBadge = ({ status }: { status: HealthStatus }) => {
  const colors = {
    Green: "bg-emerald-500/20 text-emerald-400 border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.3)] animate-pulse-glow",
    Yellow: "bg-amber-500/20 text-amber-400 border-amber-500/50 shadow-[0_0_15px_rgba(245,158,11,0.3)]",
    Red: "bg-rose-500/20 text-rose-400 border-rose-500/50 shadow-[0_0_15px_rgba(244,63,94,0.3)]"
  };

  return (
    <span className={clsx("px-3 py-1 rounded-full text-xs font-semibold border flex items-center gap-1.5", colors[status])}>
      <span className={clsx("w-2 h-2 rounded-full", {
        "bg-emerald-400": status === "Green",
        "bg-amber-400": status === "Yellow",
        "bg-rose-400": status === "Red",
      })} />
      {status}
    </span>
  );
};
