"use client";

import { useEffect, useState } from "react";
import { animate } from "framer-motion";

export const AnimatedCounter = ({ value, duration = 1.5 }: { value: number, duration?: number }) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const controls = animate(0, value, {
      duration,
      ease: "easeOut",
      onUpdate(v) {
        setCount(Math.round(v));
      },
    });

    return () => controls.stop();
  }, [value, duration]);

  return <span>{count.toLocaleString()}</span>;
};
