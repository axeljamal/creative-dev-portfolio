import { useState, type FormEvent, type ReactNode } from "react";
import { FaGithub, FaInstagram, FaLinkedin } from "react-icons/fa6";
import { LuMail, LuPhone, LuSend } from "react-icons/lu";
import { Reveal, Section } from "../components/Section";
import { Turnstile } from "../components/Turnstile";
import { profile } from "../content/profile";

type Status = "idle" | "sending" | "sent" | "error";

const fieldClass =
  "glass-field w-full px-4 py-3 text-base text-ink placeholder:text-ink-2 focus-visible:outline-2";

export function Contact() {
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");
  const [token, setToken] = useState<string | null>(null);
  // tokens are single use, so remount the widget after every attempt
  const [turnstileKey, setTurnstileKey] = useState(0);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setStatus("sending");
    try {
      const res = await fetch(`${import.meta.env.BASE_URL}api/contact`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...Object.fromEntries(new FormData(form)), token }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "");
      form.reset();
      setStatus("sent");
    } catch (err) {
      setError(err instanceof Error ? err.message : "");
      setStatus("error");
    } finally {
      setToken(null);
      setTurnstileKey((k) => k + 1);
    }
  }

  return (
    <Section id="contact" eyebrow="Contact" title="Let's build something">
      <div className="grid gap-6 lg:grid-cols-12 lg:gap-8">
        <Reveal className="lg:col-span-7">
          <form
            onSubmit={handleSubmit}
            className="glass-strong rounded-[2rem] p-6 sm:rounded-[2.5rem] sm:p-10"
          >
            <div className="relative z-2 grid gap-4">
              <label className="grid gap-1.5">
                <span className="text-sm font-semibold">Name</span>
                <input name="name" required autoComplete="name" className={fieldClass} />
              </label>
              <label className="grid gap-1.5">
                <span className="text-sm font-semibold">Email</span>
                <input
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  className={fieldClass}
                />
              </label>
              <label className="grid gap-1.5">
                <span className="text-sm font-semibold">Message</span>
                <textarea
                  name="message"
                  required
                  rows={5}
                  maxLength={5000}
                  className={`${fieldClass} resize-y`}
                />
              </label>
              {/* honeypot: hidden from people, filled in by bots */}
              <input
                name="company"
                tabIndex={-1}
                autoComplete="off"
                aria-hidden="true"
                className="absolute -left-[9999px] size-px opacity-0"
              />
              <Turnstile key={turnstileKey} onToken={setToken} />
              <div className="mt-2 flex flex-wrap items-center gap-4">
                <button
                  type="submit"
                  disabled={status === "sending" || !token}
                  className="inline-flex min-h-11 items-center gap-2 rounded-full bg-accent-solid px-6 text-[15px] font-semibold text-on-accent transition active:scale-[0.96] disabled:opacity-60"
                >
                  <LuSend aria-hidden="true" />
                  {status === "sending" ? "Sending…" : "Send message"}
                </button>
                <p role="status" aria-live="polite" className="text-[15px] font-medium">
                  {status === "sent" && "Thanks, your message is on its way."}
                  {status === "error" && (
                    <>
                      {error || "Something went wrong."} You can also email me at{" "}
                      <a className="underline" href={`mailto:${profile.email}`}>
                        {profile.email}
                      </a>
                      .
                    </>
                  )}
                </p>
              </div>
            </div>
          </form>
        </Reveal>

        <Reveal className="flex flex-col gap-4 lg:col-span-5">
          <ContactTile icon={<LuMail />} label="Email" value={profile.email} href={`mailto:${profile.email}`} />
          <ContactTile icon={<LuPhone />} label="Phone" value={profile.phone.display} href={profile.phone.href} />
          <div className="flex gap-3">
            {[
              { href: profile.links.linkedin, label: "LinkedIn", icon: FaLinkedin },
              { href: profile.links.github, label: "GitHub", icon: FaGithub },
              { href: profile.links.instagram, label: "Instagram", icon: FaInstagram },
            ].map(({ href, label, icon: Icon }) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={label}
                className="glass glass-lens grid size-14 place-items-center rounded-full text-xl transition active:scale-[0.94]"
              >
                <Icon aria-hidden="true" className="relative z-2" />
              </a>
            ))}
          </div>
        </Reveal>
      </div>
    </Section>
  );
}

function ContactTile(props: { icon: ReactNode; label: string; value: string; href: string }) {
  return (
    <a
      href={props.href}
      className="glass flex items-center gap-4 rounded-[1.75rem] p-4 transition active:scale-[0.98]"
    >
      <span className="relative z-2 grid size-12 place-items-center rounded-full bg-accent-solid text-xl text-on-accent">
        {props.icon}
      </span>
      <span className="relative z-2">
        <span className="block text-sm text-ink-2">{props.label}</span>
        <span className="block text-lg font-semibold tracking-tight">{props.value}</span>
      </span>
    </a>
  );
}
