import type { Message } from "./api";

// proposal pages published on marea-dvipa.uk; add one here when a new proposal goes live
export type Proposal = {
  url: string;
  title: string;
  client: string;
  // email domains that belong to this client, so an enquiry from them is matched to the proposal
  domains: string[];
  // one line for the reply: what the proposal offers
  pitch: string;
};

export const proposals: Proposal[] = [
  {
    url: "https://marea-dvipa.uk/proposals/nest-projects/",
    title: "Nest Projects: guest options and the owner side",
    client: "Nest Projects",
    domains: ["nestprojects.uk"],
    pitch:
      "a fresh audit of nestprojects.uk, three priced options for the guest side, from tuning what you have to one collection site with direct booking, and an add-on for the owner side: the owner guides, a property review form and the numbers owners look for",
  },
  {
    url: "https://marea-dvipa.uk/proposals/grove-collection/",
    title: "The Grove Collection: three options",
    client: "The Grove Collection / Nest Projects",
    domains: ["the-grove-collection.com"],
    pitch:
      "three options, from tuning what you have now to one collection site with direct booking. Each option is fully priced, and the page lets you see the payback on direct bookings for your own figures",
  },
];

export const studioPages = {
  guide: "https://marea-dvipa.uk/web/",
  quote: "https://marea-dvipa.uk/quote/",
};

export function proposalFor(message: Message): Proposal | undefined {
  const domain = message.email.split("@")[1]?.toLowerCase() ?? "";
  return proposals.find((p) => p.domains.includes(domain));
}

const firstName = (name: string) => name.trim().split(/\s+/)[0] || "there";

// the message looks cut off when it stops mid-sentence
const cutOff = (text: string) => !/[.!?)"'’”]\s*$/.test(text.trim());

const shortQuote = (text: string) => {
  const t = text.trim().replace(/\s+/g, " ");
  return t.length > 80 ? `${t.slice(0, 77)}…` : t;
};

// a starting draft; it is always edited and sent by hand
export function draftReply(message: Message, proposal?: Proposal, now = new Date()): string {
  const days = (now.getTime() - new Date(message.created_at).getTime()) / 86_400_000;
  const late = days > 3;
  const lines: string[] = [`Hi ${firstName(message.name)},`, ""];

  lines.push(
    `Thank you for getting in touch through my portfolio${late ? ", and sorry for the slow reply" : ""}.` +
      (cutOff(message.message)
        ? ` Your message came through cut off after "${shortQuote(message.message.replace(/^hi[^,]*,\s*/i, ""))}", so I'd love to hear what you had in mind.`
        : " I'd be glad to help."),
  );
  lines.push("");

  if (proposal) {
    lines.push(
      `In case it's useful, I'd already put together a short proposal for ${proposal.client.split(" / ")[0]} with ${proposal.pitch}:`,
      proposal.url,
    );
  } else {
    lines.push(
      "To give you a feel for how I work, here is my guide to business websites, and a quote builder where you can price the pieces you need:",
      studioPages.guide,
      studioPages.quote,
    );
  }
  lines.push("", "Would a 20-minute call next week suit you? I'm free most days.", "");
  lines.push("Best wishes,", "Axel Jamal", "Marea Dvīpa · 07356 181808", "axelle.marea-dvipa.uk");
  return lines.join("\n");
}

// same subject as the alert email, so a reply sent from the alert lands in one thread
export const replySubject = (message: Message) => `Re: New message from ${message.name}`;
