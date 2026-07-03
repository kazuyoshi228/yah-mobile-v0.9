import React from "react";
import { motion } from "framer-motion";

export function DataUsageBar({ remainingMb, totalMb }: { remainingMb: number; totalMb: number }) {
  const pct = totalMb > 0 ? Math.min(100, Math.round((remainingMb / totalMb) * 100)) : 0;
  const color = pct > 50 ? "bg-black" : pct > 20 ? "bg-amber-500" : "bg-red-500";
  const remainingGb = (remainingMb / 1024).toFixed(2);
  const totalGb = (totalMb / 1024).toFixed(1);
  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-1.5">
        <span className="font-sans text-black/40 text-xs">Data Remaining</span>
        <span className="font-sans text-black text-xs font-medium">{remainingGb} GB / {totalGb} GB</span>
      </div>
      <div className="w-full h-1.5 bg-black/8 rounded-full overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${color}`}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        />
      </div>
      <p className="font-sans text-black/30 text-xs mt-1">{pct}% remaining</p>
    </div>
  );
}
