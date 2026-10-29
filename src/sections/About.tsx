import { FaLinkedin } from "react-icons/fa6";
import { LuFileText } from "react-icons/lu";
import { Button } from "../components/Button";
import { Chip } from "../components/Chip";
import { GlassPanel } from "../components/GlassPanel";
import { Reveal, Section } from "../components/Section";
import { profile } from "../content/profile";
import { skills } from "../content/skills";
import portrait from "../assets/portrait.jpg";

export function About() {
  return (
    <Section id="about" eyebrow="About" title="Design for the whole journey">
      <div className="grid gap-6 lg:grid-cols-12 lg:gap-8">
        <Reveal className="lg:col-span-5">
          {/* the photo is a circle on white, so it sits in a circle, nudged larger to hide the white rim */}
          <div className="mx-auto aspect-square w-full max-w-md overflow-hidden rounded-full shadow-[var(--glass-shadow)] ring-1 ring-[var(--glass-rim)]">
            <img
              src={portrait}
              alt="Axel Jamal in a yellow turtleneck, smiling, in a sunlit room with plants"
              loading="lazy"
              className="size-full scale-[1.03] object-cover"
            />
          </div>
        </Reveal>

        <Reveal className="lg:col-span-7">
          <GlassPanel
            material="strong"
            className="flex h-full flex-col rounded-[2rem] p-6 sm:rounded-[2.5rem] sm:p-10"
          >
            <div className="flex flex-1 flex-col">
              <div className="space-y-4 text-lg leading-relaxed">
                {profile.bio.map((paragraph) => (
                  <p key={paragraph.slice(0, 24)}>{paragraph}</p>
                ))}
              </div>
              <div className="mt-8 flex flex-wrap gap-3">
                <Button href={profile.links.linkedin} external variant="primary" icon={<FaLinkedin />}>
                  LinkedIn
                </Button>
                <Button href={profile.cv} external icon={<LuFileText />}>
                  Download CV
                </Button>
              </div>

              <h3 className="mt-auto pt-10 font-mono text-xs font-medium tracking-[0.14em] text-accent-solid uppercase">
                Skills
              </h3>
              <ul className="mt-4 flex flex-wrap gap-2">
                {skills.map(({ name, icon: Icon }) => (
                  <Chip key={name} as="li" variant="glass" size="md" icon={<Icon />}>
                    {name}
                  </Chip>
                ))}
              </ul>
            </div>
          </GlassPanel>
        </Reveal>
      </div>
    </Section>
  );
}
