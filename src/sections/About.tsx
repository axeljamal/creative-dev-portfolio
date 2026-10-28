import { FaLinkedin } from "react-icons/fa6";
import { LuFileText } from "react-icons/lu";
import { Button } from "../components/Button";
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
          <div className="glass-strong flex h-full flex-col rounded-[2rem] p-6 sm:rounded-[2.5rem] sm:p-10">
            <div className="relative z-2 flex flex-1 flex-col">
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

              <h3 className="mt-auto pt-10 text-sm font-semibold tracking-wide text-accent-solid uppercase">
                Skills
              </h3>
              <ul className="mt-4 flex flex-wrap gap-2">
                {skills.map(({ name, icon: Icon }) => (
                  <li
                    key={name}
                    className="glass-clear inline-flex items-center gap-2 rounded-full px-3.5 py-2 text-[15px] font-medium"
                  >
                    <Icon aria-hidden="true" className="relative z-2 text-accent-solid" />
                    <span className="relative z-2">{name}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Reveal>
      </div>
    </Section>
  );
}
