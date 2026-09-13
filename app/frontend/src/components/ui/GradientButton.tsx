"use client";

import { clsx } from "clsx";
import { forwardRef, ReactNode } from "react";
import { motion, HTMLMotionProps } from "framer-motion";

interface GradientButtonProps extends Omit<HTMLMotionProps<"button">, "children"> {
  children?: ReactNode;
}

export const GradientButton = forwardRef<HTMLButtonElement, GradientButtonProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <motion.button
        ref={ref}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className={clsx(
          "relative group px-6 py-3 rounded-xl font-medium text-white shadow-lg overflow-hidden",
          className
        )}
        {...props}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-500 to-teal-600 opacity-90 group-hover:opacity-100 transition-opacity" />
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-400 to-teal-500 opacity-0 group-hover:opacity-100 blur-xl transition-opacity duration-300 -z-10" />
        <span className="relative flex items-center justify-center gap-2">{children}</span>
      </motion.button>
    );
  }
);

GradientButton.displayName = "GradientButton";


