"use client";

import { useEffect, useState } from "react";
import { useReducedMotion } from "framer-motion";

export function usePreviewCycle(totalStages: number, duration = 3500) {
  const [stage, setStage] = useState(0);
  const [playing, setPlaying] = useState(true);
  const reduced = useReducedMotion();

  useEffect(() => {
    if (!playing || reduced) return;
    const timer = setInterval(() => setStage((value) => (value + 1) % totalStages), duration);
    return () => clearInterval(timer);
  }, [playing, reduced, totalStages, duration]);

  return {
    stage: reduced ? totalStages - 1 : stage,
    playing,
    reduced,
    togglePlaying: () => setPlaying((value) => !value),
  };
}
