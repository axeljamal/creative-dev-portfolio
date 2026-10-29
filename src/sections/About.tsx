import { FaLinkedin } from "react-icons/fa6";
import { LuFileText } from "react-icons/lu";
import { Button } from "../components/Button";
import { Chip } from "../components/Chip";
import { GlassPanel } from "../components/GlassPanel";
import { Reveal, Section } from "../components/Section";
import { profile } from "../content/profile";
import { skills } from "../content/skills";
import portrait from "../assets/about.jpg";

export function About() {
  return (
    <Section id="about" eyebrow="About" title="Design for the whole journey">
      <div className="grid gap-6 lg:grid-cols-12 lg:gap-8">
        <Reveal className="lg:col-span-5">
          <img
            src={portrait}
            alt="Axel Jamal holding a bouquet of red roses outside a flower shop"
            loading="lazy"
            className="aspect-[4/5] w-full rounded-[2rem] object-cover object-[45%_center] shadow-[var(--glass-shadow)] sm:rounded-[2.5rem]"
          />
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
