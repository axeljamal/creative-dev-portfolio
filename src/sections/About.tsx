import { FaLinkedin } from "react-icons/fa6";
import { LuFileText } from "react-icons/lu";
import { Button } from "../components/Button";
import { GlassPanel } from "../components/GlassPanel";
import { Reveal, Section } from "../components/Section";
import { Tilt } from "../components/Tilt";
import { profile } from "../content/profile";
import { skillGroups } from "../content/skills";
import portrait from "../assets/portrait.jpg";

export function About() {
  return (
    <Section id="about" eyebrow="About" title="Design for the whole journey">
      <div className="grid gap-6 lg:grid-cols-12 lg:gap-8">
        <Reveal className="lg:col-span-5">
          {/* the photo is a circle on white, so it sits in a circle, nudged larger to hide the white rim */}
          <Tilt lean={12} className="mx-auto aspect-square w-full max-w-md rounded-full">
          <div className="size-full overflow-hidden rounded-full shadow-[var(--glass-shadow)] ring-1 ring-[var(--glass-rim)]">
            <img
              src={portrait}
              alt="Axel Jamal in a yellow turtleneck, smiling, in a sunlit room with plants"
              loading="lazy"
              className="size-full scale-[1.03] object-cover"
            />
          </div>
          </Tilt>
        </Reveal>

        <Reveal className="lg:col-span-7">
          <GlassPanel
            material="strong"
            className="flex h-full flex-col rounded-[2rem] p-6 sm:rounded-[2.5rem] sm:p-10"
          >
            <div className="flex flex-1 flex-col">
              <p className="mb-4 font-mono text-xs font-medium tracking-[0.14em] text-accent-solid uppercase">
                {profile.title} · {profile.location}
              </p>
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

            </div>
          </GlassPanel>
        </Reveal>
      </div>

      <Reveal>
        <GlassPanel material="strong" className="mt-6 rounded-[2rem] p-6 sm:rounded-[2.5rem] sm:p-10 lg:mt-8">
          <h3 className="font-mono text-xs font-medium tracking-[0.14em] text-accent-solid uppercase">
            Skills, and where to see them
          </h3>
          <div className="mt-6 grid gap-x-10 gap-y-8 md:grid-cols-2 xl:grid-cols-3">
            {skillGroups.map(({ area, skills }) => (
              <section key={area} aria-labelledby={`skills-${area}`}>
                <h4 id={`skills-${area}`} className="text-lg font-semibold">
                  {area}
                </h4>
                <ul className="mt-3 space-y-3">
                  {skills.map(({ name, icon: Icon, where }) => (
                    <li key={name} className="flex gap-3">
                      <Icon aria-hidden="true" className="mt-1 size-4 shrink-0 text-accent-solid" />
                      <div>
                        <p className="font-medium leading-snug">{name}</p>
                        <p className="text-sm leading-snug opacity-75">{where}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </GlassPanel>
      </Reveal>
    </Section>
  );
}
