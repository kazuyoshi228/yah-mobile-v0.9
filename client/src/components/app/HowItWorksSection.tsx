import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { motion, useScroll, useSpring, useTransform, useMotionValueEvent } from "framer-motion";
import FadeIn from "./FadeIn";
import { serif } from "./types";

const STEP_KEYS = ["step1", "step2", "step3", "step4"] as const;
const STEP_NUMS = ["01", "02", "03", "04"];

export default function HowItWorksSection() {
  const { t } = useTranslation();
  const sectionRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start 70%", "end 60%"],
  });
  const smoothProgress = useSpring(scrollYProgress, { stiffness: 50, damping: 18, restDelta: 0.001 });
  const barHeight = useTransform(smoothProgress, [0, 1], ["0%", "100%"]);
  const arrowTop = useTransform(smoothProgress, [0, 1], ["-20px", "calc(100% - 20px)"]);

  const thresholds = [0.05, 0.3, 0.55, 0.8];
  const [activeStep, setActiveStep] = useState(-1);
  useMotionValueEvent(smoothProgress, "change", (v) => {
    let active = -1;
    for (let i = thresholds.length - 1; i >= 0; i--) {
      if (v >= thresholds[i]) { active = i; break; }
    }
    setActiveStep(active);
  });

  return (
    <section ref={sectionRef} id="how-it-works" className="py-24 lg:py-36 bg-white">
      <div className="container">
        <FadeIn>
          <p className="text-label text-black/35 mb-3">{t("howItWorks.sectionLabel")}</p>
          <h2 className="text-black" style={serif("clamp(2.25rem, 4.5vw, 3.75rem)")}>{t("howItWorks.title")}</h2>
        </FadeIn>

        <div className="mt-16 flex gap-0">
          {/* Left: vertical progress bar */}
          <div className="hidden md:flex flex-col items-center mr-10 w-10 shrink-0">
            <div className="relative flex-1 w-[2px] bg-[#E8E8E8] min-h-[400px]">
              <motion.div className="absolute top-0 left-0 w-full bg-black origin-top" style={{ height: barHeight }} />
              <motion.div
                className="absolute left-1/2 -translate-x-1/2 pointer-events-none"
                style={{ top: arrowTop }}
              >
                <div className="w-9 h-9 rounded-full bg-black flex items-center justify-center">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M7 2v10M3 8l4 4 4-4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              </motion.div>
            </div>
          </div>

          {/* Right: step cards */}
          <div className="flex-1 flex flex-col divide-y divide-[#D7D7D7] border-t border-b border-[#D7D7D7]">
            {STEP_KEYS.map((key, i) => (
              <FadeIn key={key} delay={i * 0.1} className="py-10 pl-0 md:pl-6">
                <div className="flex items-start gap-6">
                  <motion.div
                    animate={{
                      background: activeStep >= i ? "#000" : "#fff",
                      color: activeStep >= i ? "#fff" : "#000",
                      borderColor: activeStep >= i ? "#000" : "#D7D7D7",
                    }}
                    transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
                    className="font-sans font-semibold text-[0.6875rem] tracking-[0.12em] w-12 h-12 rounded-full flex items-center justify-center border-[1.5px] shrink-0"
                  >
                    {STEP_NUMS[i]}
                  </motion.div>
                  <div className="flex-1 pt-1">
                    <h3 className="font-sans text-black mb-2 text-[1.25rem]">{t(`howItWorks.${key}.title`)}</h3>
                    <p className="font-sans text-black/50 text-[0.9375rem] leading-[1.75]">{t(`howItWorks.${key}.desc`)}</p>
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
