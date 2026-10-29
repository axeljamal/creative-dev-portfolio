import { AnimatePresence, motion } from "motion/react";
import { LuHandshake, LuMail } from "react-icons/lu";
import { useActiveSection } from "../hooks/useActiveSection";
import { buttonClass } from "./Button";

const ids = ["home", "work", "about", "contact"];
export type ContactIntent = "collaborate" | "contact";

// Floating "Collaborate" and "Contact", both to the message form. They step aside over the welcome film (it has its
// own controls) and at the form itself. Collaborate also starts the message for you.
export function FloatingActions() {
  const active = useActiveSection(ids);
  const show = active !== "home" && active !== "contact";

  const go = (intent: ContactIntent) => () => {
    // the form reads this once it is on screen (see Contact)
    window.dispatchEvent(new CustomEvent<ContactIntent>("contact-intent", { detail: intent }));
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 24, scale: 0.9 }}
          transition={{ type: "spring", stiffness: 380, damping: 30 }}
          className="fixed right-4 bottom-[calc(max(env(safe-area-inset-bottom),12px)+5.5rem)] z-40 flex flex-col items-end gap-2 md:right-6 md:bottom-6"
        >
          <div className="floating-bob flex flex-col items-end gap-2">
            <a href="#contact" onClick={go("collaborate")} className={`${buttonClass("primary")} shadow-lg`}>
              <LuHandshake aria-hidden="true" className="relative z-2 text-[1.1em]" />
              <span className="relative z-2">Collaborate</span>
            </a>
            <a href="#contact" onClick={go("contact")} className={`${buttonClass("glass")} shadow-lg`}>
              <LuMail aria-hidden="true" className="relative z-2 text-[1.1em]" />
              <span className="relative z-2">Contact</span>
            </a>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
