import { clsx } from "clsx";

export const Shimmer = ({ className }: { className?: string }) => {
  return (
    <div
      className={clsx(
        "relative overflow-hidden rounded bg-white/5",
        className
      )}
    >
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
    </div>
  );
};
