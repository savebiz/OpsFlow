import { clsx, type ClassValue } from 'clsx';
import { forwardRef } from 'react';

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  animatedBorder?: boolean;
}

export const GlassCard = forwardRef<HTMLDivElement, GlassCardProps>(
  ({ className, children, animatedBorder = false, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={clsx(
          "glass-card p-6",
          animatedBorder && "animate-gradient-border",
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

GlassCard.displayName = "GlassCard";
