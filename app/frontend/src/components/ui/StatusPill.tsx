import { clsx } from "clsx";

export const StatusPill = ({ status }: { status: "Submitted" | "Pending" | "Missing" | "Flagged" | "Approved" }) => {
  const styles = {
    Submitted: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
    Pending: "bg-amber-500/10 text-amber-400 border border-amber-500/20",
    Missing: "bg-rose-500/10 text-rose-400 border border-rose-500/20",
    Flagged: "bg-orange-500/10 text-orange-400 border border-orange-500/20",
    Approved: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
  };

  return (
    <span className={clsx("px-2.5 py-1 rounded-md text-xs font-medium", styles[status])}>
      {status}
    </span>
  );
};
