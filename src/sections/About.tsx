// About, as the same card flow as the work: Axelle in the middle facing you, the intro on her right and the design
// skills beyond it, AI on her left and the front end beyond that, and round the back of the ring the rest of the
// skills, the contact card and each social on a card of its own. It wraps round like the work.
import { useState, type ReactNode } from "react";
import { FaGithub, FaInstagram, FaLinkedin } from "react-icons/fa6";
import { LuArrowUpRight, LuFileText, LuMail } from "react-icons/lu";
import { PipBeside, PipChat } from "../components/AskPip";
import { CoverFlow, type FlowItem } from "../components/CoverFlow";
import { Section } from "../components/Section";
import { profile } from "../content/profile";
import { skillGroups } from "../content/skills";
import portrait from "../assets/portrait-full.webp";

const group = (area: string) => skillGroups.find((g) => g.area === area);

// a card's face: an eyebrow, a heading and whatever sits under it, scrolling inside the card when it runs long
function Face({ eyebrow, title, children }: { eyebrow: string; title: string; children: ReactNode }) {
  return (
    <div className="about-card">
      <p className="about-card-eyebrow">{eyebrow}</p>
      <h3 className="about-card-title">{title}</h3>
      <div className="about-card-scroll">{children}</div>
    </div>
  );
}

function skillsCard(area: string): FlowItem | null {
  const g = group(area);
  if (!g) return null;
  return {
    name: area,
    body: () => (
      <Face eyebrow="Skills, and where to see them" title={area}>
        <ul className="about-skills">
          {g.skills.map(({ name, icon: Icon, where }) => (
            <li key={name}>
              <Icon aria-hidden="true" />
              <div>
                <p className="about-skill-name">{name}</p>
                <p className="about-skill-where">{where}</p>
              </div>
            </li>
          ))}
        </ul>
      </Face>
    ),
  };
}

// one link card: a social, the CV, or the email
function linkCard(name: string, eyebrow: string, line: string, href: string, icon: ReactNode, cta: string, external = true): FlowItem {
  return {
    name,
    body: (centre) => (
      <div className="about-card about-link-card">
        <p className="about-card-eyebrow">{eyebrow}</p>
        <span className="about-link-icon" aria-hidden="true">
          {icon}
        </span>
        <h3 className="about-card-title">{name}</h3>
        <p className="about-link-line">{line}</p>
        <a
          className="coverflow-cta"
          href={href}
          tabIndex={centre ? undefined : -1}
          {...(external ? { target: "_blank", rel: "noreferrer" } : {})}
        >
          {cta}
          <LuArrowUpRight aria-hidden="true" />
        </a>
      </div>
    ),
  };
}

// Axelle on the page itself, with Pip from Dua Pulau standing beside her to answer questions about her
function AxelleCard({ centre }: { centre: boolean }) {
  const [asking, setAsking] = useState(false);
  return (
    <div className="about-portrait">
      <img
        src={portrait}
        alt="Axel Jamal standing, in a mustard turtleneck, cream wide-leg trousers and black ankle boots"
        width={600}
        height={1208}
        draggable={false}
      />
      <PipBeside active={centre && !asking} onAsk={() => setAsking(true)} />
      {/* who's who, in brick speech boxes: hers by her shoulder, Pip's (his button) over him */}
      <p className="brick-say brick-say-axel">
        <b>Axel Jamal</b>
        <span>Founder &amp; Design Engineer</span>
      </p>
      {centre && asking && <PipChat onClose={() => setAsking(false)} />}
    </div>
  );
}

const handle = (url: string) => url.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "");

// the ring, from the middle card rightwards; the last two cards sit to Axelle's left
const cards: FlowItem[] = [
  { name: "Axel Jamal", body: (centre: boolean) => <AxelleCard centre={centre} /> },
  {
    name: "Intro",
    body: () => (
      <Face eyebrow={profile.title} title="Intro">
        {/* the first three paragraphs: "Before tech" stays out of this section (Dua Pulau's gate and Pip still use it) */}
        {profile.bio.slice(0, 3).map((paragraph) => (
          <p key={paragraph.slice(0, 24)} className="about-card-text">
            {paragraph}
          </p>
        ))}
      </Face>
    ),
  },
  skillsCard("Design"),
  ...skillGroups.filter((g) => !["Design", "Front end", "AI"].includes(g.area)).map((g) => skillsCard(g.area)),
  linkCard("Contact", "Say hello", profile.email, `mailto:${profile.email}`, <LuMail />, "Send an email", false),
  linkCard("LinkedIn", "Social", handle(profile.links.linkedin), profile.links.linkedin, <FaLinkedin />, "Open LinkedIn"),
  linkCard("GitHub", "Social", handle(profile.links.github), profile.links.github, <FaGithub />, "Open GitHub"),
  linkCard("Instagram", "Social", handle(profile.links.instagram), profile.links.instagram, <FaInstagram />, "Open Instagram"),
  linkCard("CV", "Download", "My CV, as a PDF", profile.cv, <LuFileText />, "Download CV"),
  skillsCard("Front end"),
  skillsCard("AI"),
].filter((c): c is FlowItem => !!c);

export function About() {
  const [pick, setPick] = useState(0);
  return (
    <Section id="about" eyebrow="About" title="Design for the whole journey" ownHeading>
      <header className="work-heading">
        <p className="font-mono text-xs font-medium tracking-[0.14em] text-accent-solid uppercase">About</p>
        <h2 id="about-title" className="title-3d mt-2 font-display text-5xl leading-[1.02] font-semibold sm:text-6xl">
          Design for
          <br />
          the whole journey
        </h2>
      </header>
      <CoverFlow
        items={cards}
        index={pick}
        onIndex={setPick}
        label="About Axel"
        noun="card"
        hint="Slide the cards to browse: the intro, each set of skills, contact and socials."
      />
    </Section>
  );
}
