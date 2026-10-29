import { FaGithub } from "react-icons/fa6";
import { LuArrowUpRight, LuBox } from "react-icons/lu";
import { Button } from "../components/Button";
import { Chip } from "../components/Chip";
import { Reveal, Section } from "../components/Section";
import { caseStudies, earlierWork, type CaseStudy } from "../content/work";

export function Work() {
  return (
    <Section id="work" eyebrow="Case studies" title="Selected work">
      <div className="flex flex-col gap-6 sm:gap-10">
        {caseStudies.map((study, i) => (
          <Reveal key={study.name}>
            <CaseStudyCard study={study} flip={i % 2 === 1} />
          </Reveal>
        ))}
      </div>

      <h3 className="mt-20 mb-6 font-display text-3xl font-semibold sm:text-4xl">Earlier work</h3>
      {/* swipeable rail on phones, grid on larger screens */}
      <ul className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-6 sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 lg:grid-cols-3">
        {earlierWork.map((project) => (
          <li key={project.name} className="w-[82%] shrink-0 snap-center sm:w-auto">
            <article className="glass flex h-full flex-col rounded-[1.75rem] p-2.5">
              <img
                src={project.image}
                alt={`Screenshot of ${project.name}`}
                loading="lazy"
                className="relative z-2 aspect-[16/10] w-full rounded-[1.25rem] object-cover object-top"
              />
              <div className="relative z-2 flex flex-1 flex-col p-3.5">
                <h4 className="font-display text-2xl font-semibold">{project.name}</h4>
                <p className="mt-1.5 flex-1 text-[15px] leading-relaxed text-ink-2">
                  {project.details}
                </p>
                <div className="mt-4 flex gap-2">
                  <Button href={project.pageLink} external icon={<LuArrowUpRight />}>
                    View
                  </Button>
                  <Button href={project.sourceLink} external icon={<FaGithub />}>
                    Source
                  </Button>
                </div>
              </div>
            </article>
          </li>
        ))}
      </ul>
    </Section>
  );
}

function CaseStudyCard({ study, flip }: { study: CaseStudy; flip: boolean }) {
  return (
    <article className="glass-strong grid gap-2 rounded-[2rem] p-2.5 sm:rounded-[2.5rem] sm:p-3 lg:grid-cols-12">
      <div
        className={`relative z-2 self-center overflow-hidden rounded-[1.5rem] sm:rounded-[2rem] lg:col-span-7 ${flip ? "lg:order-2" : ""}`}
      >
        {study.image ? (
          <img
            src={study.image}
            alt={`Screenshot of ${study.name}`}
            loading="lazy"
            className="aspect-[16/10] size-full object-cover"
          />
        ) : (
          <div
            aria-hidden="true"
            className="grid aspect-[16/10] size-full place-items-center bg-[radial-gradient(circle_at_30%_20%,var(--sun),var(--accent)_45%,var(--leaf))]"
          >
            <div className="glass-clear grid size-28 place-items-center rounded-[2rem]">
              <LuBox className="relative z-2 size-12 text-white" />
            </div>
          </div>
        )}
      </div>

      <div className="relative z-2 flex flex-col p-4 sm:p-6 lg:col-span-5">
        <h3 className="font-display text-4xl font-semibold">{study.name}</h3>
        <p className="mt-2 text-[15px] leading-relaxed text-ink-2">{study.role}</p>
        <ul aria-label="Tools" className="mt-4 flex flex-wrap gap-1.5">
          {study.stack.map((tool) => (
            <Chip key={tool} as="li">
              {tool}
            </Chip>
          ))}
        </ul>
        <dl className="mt-6 space-y-4 text-[15px] leading-relaxed">
          {(["problem", "approach", "result"] as const).map((key) => (
            <div key={key}>
              <dt className="font-semibold capitalize">{key}</dt>
              <dd className="mt-0.5 text-ink-2">{study[key]}</dd>
            </div>
          ))}
        </dl>
        {(study.pageLink || study.sourceLink) && (
          <div className="mt-6 flex gap-2">
            {study.pageLink && (
              <Button href={study.pageLink} external variant="primary" icon={<LuArrowUpRight />}>
                View
              </Button>
            )}
            {study.sourceLink && (
              <Button href={study.sourceLink} external icon={<FaGithub />}>
                Source
              </Button>
            )}
          </div>
        )}
      </div>
    </article>
  );
}
