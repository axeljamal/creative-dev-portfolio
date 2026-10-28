import { motion } from "motion/react";
import { FaGithub } from "react-icons/fa6";
import { LuArrowRight, LuFileText, LuMapPin } from "react-icons/lu";
import { Button } from "../components/Button";
import { Chip } from "../components/Chip";
import { profile } from "../content/profile";
import hero from "../assets/hero.jpg";

export function Hero() {
  return (
    <section id="home" aria-labelledby="home-title" className="pt-4 md:pt-28">
      <div className="relative overflow-hidden rounded-[2.25rem] sm:rounded-[3rem]">
        <motion.img
          src={hero}
          alt=""
          initial={{ scale: 1.08 }}
          animate={{ scale: 1 }}
          transition={{ duration: 1.6, ease: [0.22, 1, 0.36, 1] }}
          className="absolute inset-0 size-full object-cover"
        />
        <div className="relative flex min-h-[calc(100svh-7rem)] items-end p-3 sm:p-6 md:min-h-[78svh] md:p-8">
          <motion.div
            initial={{ opacity: 0, y: 32 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="glass glass-lens w-full max-w-2xl rounded-[1.75rem] p-6 sm:rounded-[2.25rem] sm:p-10"
          >
            <div className="relative z-2">
              <Chip variant="glass" icon={<LuMapPin />}>
                {profile.location}
              </Chip>
              <h1
                id="home-title"
                className="mt-5 text-5xl font-bold tracking-tighter text-balance sm:text-7xl"
              >
                {profile.name}
              </h1>
              <p className="mt-3 text-xl font-semibold tracking-tight text-balance sm:text-2xl">
                {profile.title}
              </p>
              <p className="mt-4 max-w-xl text-base leading-relaxed text-ink-2 sm:text-lg">
                {profile.intro}
              </p>
              <div className="mt-7 flex flex-wrap gap-2 sm:gap-3">
                <Button href="#work" variant="primary" icon={<LuArrowRight />}>
                  View work
                </Button>
                <Button href={profile.cv} external icon={<LuFileText />}>
                  CV
                </Button>
                <Button
                  href={profile.links.github}
                  external
                  icon={<FaGithub />}
                  aria-label="GitHub"
                  className="px-3.5"
                />
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
