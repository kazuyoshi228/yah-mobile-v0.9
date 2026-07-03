import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, X, AlertTriangle, ChevronDown } from "lucide-react";

type CompatStatus = "compatible" | "not-compatible" | "check-carrier";

const DEVICE_DB: Record<string, Record<string, { status: CompatStatus; note: string }>> = {
  Apple: {
    "iPhone XS / XS Max / XR": { status: "compatible", note: "eSIM supported. Ensure SIM-unlocked." },
    "iPhone 11 / 11 Pro / 11 Pro Max": { status: "compatible", note: "eSIM supported. Ensure SIM-unlocked." },
    "iPhone 12 / 12 mini / 12 Pro / 12 Pro Max": { status: "compatible", note: "eSIM supported. Ensure SIM-unlocked." },
    "iPhone 13 / 13 mini / 13 Pro / 13 Pro Max": { status: "compatible", note: "eSIM supported. Ensure SIM-unlocked." },
    "iPhone 14 / 14 Plus / 14 Pro / 14 Pro Max": { status: "compatible", note: "eSIM supported. US models are eSIM-only." },
    "iPhone 15 / 15 Plus / 15 Pro / 15 Pro Max": { status: "compatible", note: "eSIM supported. Ensure SIM-unlocked." },
    "iPhone 16 / 16 Plus / 16 Pro / 16 Pro Max": { status: "compatible", note: "eSIM supported. Ensure SIM-unlocked." },
    "iPhone X or older": { status: "not-compatible", note: "iPhone X and earlier do not support eSIM." },
  },
  Samsung: {
    "Galaxy S20 / S20+ / S20 Ultra": { status: "compatible", note: "eSIM supported. Ensure SIM-unlocked." },
    "Galaxy S21 / S21+ / S21 Ultra": { status: "compatible", note: "eSIM supported. Ensure SIM-unlocked." },
    "Galaxy S22 / S22+ / S22 Ultra": { status: "compatible", note: "eSIM supported. Ensure SIM-unlocked." },
    "Galaxy S23 / S23+ / S23 Ultra": { status: "compatible", note: "eSIM supported. Ensure SIM-unlocked." },
    "Galaxy S24 / S24+ / S24 Ultra": { status: "compatible", note: "eSIM supported. Ensure SIM-unlocked." },
    "Galaxy Z Flip / Z Fold series": { status: "compatible", note: "eSIM supported. Ensure SIM-unlocked." },
    "Galaxy Note 20 / Note 20 Ultra": { status: "compatible", note: "eSIM supported. Ensure SIM-unlocked." },
    "Galaxy S10 / S10+": { status: "check-carrier", note: "Some models support eSIM. Check your carrier." },
    "Other Galaxy models": { status: "check-carrier", note: "eSIM support varies. Check Samsung's official list." },
  },
  Google: {
    "Pixel 3 / 3 XL": { status: "compatible", note: "eSIM supported. Ensure SIM-unlocked." },
    "Pixel 4 / 4 XL / 4a": { status: "compatible", note: "eSIM supported. Ensure SIM-unlocked." },
    "Pixel 5 / 5a": { status: "compatible", note: "eSIM supported. Ensure SIM-unlocked." },
    "Pixel 6 / 6 Pro / 6a": { status: "compatible", note: "eSIM supported. Ensure SIM-unlocked." },
    "Pixel 7 / 7 Pro / 7a": { status: "compatible", note: "eSIM supported. Ensure SIM-unlocked." },
    "Pixel 8 / 8 Pro / 8a": { status: "compatible", note: "eSIM supported. Ensure SIM-unlocked." },
    "Pixel 9 / 9 Pro / 9 Pro XL": { status: "compatible", note: "eSIM supported. Ensure SIM-unlocked." },
    "Pixel 2 or older": { status: "not-compatible", note: "Pixel 2 and earlier do not support eSIM." },
  },
  Other: {
    "My device is not listed": { status: "check-carrier", note: "Check your device settings: Settings → General → About → look for eSIM or Digital SIM. If listed, it may be compatible." },
  },
};

const STATUS_CONFIG = {
  compatible: {
    icon: Check,
    label: "Compatible",
    bg: "bg-[#F0FAF0]",
    border: "border-[#C3E6C3]",
    iconColor: "text-[#2D7A2D]",
    textColor: "text-[#1A5C1A]",
  },
  "not-compatible": {
    icon: X,
    label: "Not Compatible",
    bg: "bg-[#FFF5F5]",
    border: "border-[#F5C6C6]",
    iconColor: "text-[#C0392B]",
    textColor: "text-[#922B21]",
  },
  "check-carrier": {
    icon: AlertTriangle,
    label: "Check with Carrier",
    bg: "bg-[#FFFBF0]",
    border: "border-[#F5DFA0]",
    iconColor: "text-[#B7860B]",
    textColor: "text-[#7D5A00]",
  },
};

export default function DeviceChecker() {
  const [selectedMaker, setSelectedMaker] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState<string | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const makers = Object.keys(DEVICE_DB);
  const models = selectedMaker ? Object.keys(DEVICE_DB[selectedMaker]) : [];
  const result = selectedMaker && selectedModel ? DEVICE_DB[selectedMaker][selectedModel] : null;

  const handleMakerSelect = (maker: string) => { setSelectedMaker(maker); setSelectedModel(null); setDropdownOpen(false); };
  const handleModelSelect = (model: string) => { setSelectedModel(model); setDropdownOpen(false); };
  const handleReset = () => { setSelectedMaker(null); setSelectedModel(null); setDropdownOpen(false); };

  return (
    <div className="mt-12">
      {/* Step 1: Maker */}
      <div className="mb-8">
        <p className="font-sans text-black/50 mb-4 text-[0.8125rem] tracking-[0.12em] uppercase">Step 1 — Select your device brand</p>
        <div className="flex flex-wrap gap-3">
          {makers.map((maker) => (
            <motion.button
              key={maker}
              onClick={() => handleMakerSelect(maker)}
              whileTap={{ scale: 0.97 }}
              className={`font-sans px-6 py-3 border transition-all duration-200 text-[0.9375rem] ${
                selectedMaker === maker
                  ? "font-medium bg-black text-white border-black"
                  : "font-normal bg-white text-black border-[#D7D7D7] hover:border-black"
              }`}
            >
              {maker}
            </motion.button>
          ))}
        </div>
      </div>

      {/* Step 2: Model */}
      {selectedMaker && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
          className="mb-8"
        >
          <p className="font-sans text-black/50 mb-4 text-[0.8125rem] tracking-[0.12em] uppercase">Step 2 — Select your model</p>
          <div className="relative inline-block w-full max-w-md">
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="font-sans w-full flex items-center justify-between px-5 py-3.5 bg-white border border-[#D7D7D7] hover:border-black transition-colors duration-200 text-[0.9375rem]"
            >
              <span className={selectedModel ? "text-black" : "text-black/35"}>{selectedModel ?? "Choose a model..."}</span>
              <motion.span animate={{ rotate: dropdownOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
                <ChevronDown size={16} className="text-black/50" />
              </motion.span>
            </button>
            {dropdownOpen && (
              <motion.ul
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.18, ease: [0.23, 1, 0.32, 1] }}
                className="absolute z-20 w-full bg-white border border-[#D7D7D7] shadow-lg mt-1 max-h-64 overflow-y-auto"
              >
                {models.map((model) => (
                  <li key={model}>
                    <button
                      onClick={() => handleModelSelect(model)}
                      className="font-sans w-full text-left px-5 py-3 hover:bg-[#F7F7F7] transition-colors duration-150 border-b border-[#F0F0F0] last:border-b-0 text-[0.875rem]"
                    >
                      {model}
                    </button>
                  </li>
                ))}
              </motion.ul>
            )}
          </div>
        </motion.div>
      )}

      {/* Step 3: Result */}
      <AnimatePresence>
        {result && (() => {
          const cfg = STATUS_CONFIG[result.status];
          const Icon = cfg.icon;
          return (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
              className={`p-6 border ${cfg.bg} ${cfg.border} flex items-start gap-4`}
            >
              <div className={`flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-full ${cfg.bg} border ${cfg.border}`}>
                <Icon size={20} className={cfg.iconColor} strokeWidth={2} />
              </div>
              <div className="flex-1">
                <p className={`font-sans font-medium mb-1 text-[1rem] ${cfg.textColor}`}>{cfg.label}</p>
                <p className="font-sans text-black/60 text-[0.875rem] leading-[1.7]">{result.note}</p>
              </div>
              <button onClick={handleReset} className="flex-shrink-0 text-black/30 hover:text-black transition-colors duration-150 mt-0.5" aria-label="Reset checker">
                <X size={16} />
              </button>
            </motion.div>
          );
        })()}
      </AnimatePresence>

      {/* Quick guide when no selection */}
      {!selectedMaker && (
        <div className="border border-[#D7D7D7] p-6">
          <p className="font-sans text-black/50 mb-4 text-[0.8125rem] tracking-[0.12em] uppercase">Before you check</p>
          <div className="space-y-3">
            {[
              "Your device must support eSIM (dual SIM or eSIM-only).",
              "Your device must be SIM-unlocked (not locked to a carrier).",
              "iOS 17.4+ or Android 9.0+ recommended for best compatibility.",
            ].map((text, i) => (
              <div key={i} className="flex items-start gap-3">
                <span className="font-sans font-medium text-black mt-0.5 flex-shrink-0 text-[0.875rem]">✓</span>
                <p className="font-sans text-black/60 text-[0.875rem] leading-[1.65]">{text}</p>
              </div>
            ))}
          </div>
          <p className="font-sans text-black/35 mt-5 text-[0.8125rem]">Select your brand above to check your specific model.</p>
        </div>
      )}
    </div>
  );
}
