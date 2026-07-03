import { useState } from "react";
import { motion } from "framer-motion";
import { ChevronDown } from "lucide-react";

const DEVICES = [
  { name: "iPhone", desc: "All models from iPhone XS onwards (XS / XR / 11 / 12 / 13 / 14 / 15 / 16 series)" },
  { name: "Google Pixel", desc: "Pixel 3 and later (excluding some carrier-locked models)" },
  { name: "Samsung Galaxy", desc: "Galaxy S20 and later / Z Flip / Z Fold / Note 20 series" },
  { name: "Other Android", desc: "Any eSIM-compatible device with SIM lock removed" },
];

export default function ReferenceAccordion() {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-16 pt-12 border-t border-[#E8E8E8]">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-3 w-full text-left group"
        aria-expanded={open}
      >
        <p className="text-label text-black/35 flex-1">Reference — Supported device families</p>
        <motion.div
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
          className="text-black/35 group-hover:text-black/60 transition-colors"
        >
          <ChevronDown size={16} />
        </motion.div>
      </button>
      <motion.div
        initial={false}
        animate={{ height: open ? "auto" : 0, opacity: open ? 1 : 0 }}
        transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
        className="overflow-hidden"
      >
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-px bg-[#D7D7D7]">
          {DEVICES.map((d, i) => (
            <div key={i} className="bg-white p-6">
              <p className="font-sans font-medium text-black mb-1 text-[0.9375rem]">{d.name}</p>
              <p className="font-sans text-black/50 text-[0.875rem] leading-[1.7]">{d.desc}</p>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
