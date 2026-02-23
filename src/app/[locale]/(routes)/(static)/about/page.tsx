import type { Metadata } from "next";
import { getLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { CheckIcon } from "lucide-react";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "À propos · The Playground",
    description:
      "L'histoire de The Playground — pourquoi, comment, et où on en est.",
    openGraph: {
      title: "À propos · The Playground",
      description:
        "L'histoire de The Playground — pourquoi, comment, et où on en est.",
    },
  };
}

export default async function AboutPage() {
  const locale = await getLocale();
  const isFr = locale === "fr";

  return (
    <div className="mx-auto max-w-2xl px-4 py-16 space-y-14">

      {/* ── Section 1 — Hook ── */}
      <section className="space-y-6">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          <span className="text-violet-500">✦</span>
          <span>
            {isFr
              ? "Expérience Claude Code · The Playground"
              : "A Claude Code Experiment · The Playground"}
          </span>
        </div>
        <h1 className="text-4xl font-extrabold tracking-tight leading-tight">
          {isFr ? (
            <>
              Ce projet a commencé comme{" "}
              <span className="bg-gradient-to-r from-pink-500 to-violet-500 bg-clip-text text-transparent">
                un prétexte
              </span>
              .
            </>
          ) : (
            <>
              This project started as{" "}
              <span className="bg-gradient-to-r from-pink-500 to-violet-500 bg-clip-text text-transparent">
                a pretext
              </span>
              .
            </>
          )}
        </h1>
        <p className="text-lg leading-relaxed text-muted-foreground">
          {isFr
            ? "Un prétexte pour explorer Claude Code — l'outil de développement IA d'Anthropic — sur un vrai projet avec de vraies contraintes. Quelques jours plus tard, j'avais une plateforme qui fonctionne et je me posais sérieusement la question de l'ouvrir au public."
            : "A pretext to explore Claude Code — Anthropic's AI development tool — on a real project with real constraints. A few days later, I had a working platform and was seriously wondering whether to open it to the public."}
        </p>
      </section>

      <hr className="border-border" />

      {/* ── Section 2 — Le problème ── */}
      <section className="space-y-6">
        <h2 className="text-2xl font-bold tracking-tight">
          {isFr ? "Le problème" : "The problem"}
        </h2>
        <div className="space-y-4 text-[17px] leading-relaxed text-muted-foreground">
          <p>
            {isFr
              ? "Ça fait des années que j'organise des événements communautaires. Et depuis des années, je me heurte au même mur."
              : "I've been running community events for years. And for years, I've hit the same wall."}
          </p>
          <p>
            {isFr ? (
              <>
                Il n'existe pas d'outil qui fait à la fois{" "}
                <strong className="text-foreground">
                  communauté + événements + gratuit + UX correcte + maîtrise de
                  son audience
                </strong>
                .
              </>
            ) : (
              <>
                There's no tool that does{" "}
                <strong className="text-foreground">
                  community + events + free + good UX + audience ownership
                </strong>{" "}
                all at once.
              </>
            )}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-orange-200 bg-white p-4 dark:bg-card dark:border-orange-900/40">
            <p className="text-sm font-bold text-orange-600 mb-2">Meetup</p>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {isFr
                ? "Modèle communautaire intéressant, mais UX datée et paywall organisateur."
                : "Good community model, but dated UX and organizer paywall."}
            </p>
          </div>
          <div className="rounded-xl border border-blue-200 bg-white p-4 dark:bg-card dark:border-blue-900/40">
            <p className="text-sm font-bold text-blue-600 mb-2">Luma</p>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {isFr
                ? "Expérience propre, pages événement belles. Mais chaque événement est une île — aucune rétention."
                : "Clean experience, beautiful event pages. But every event is an island — no retention."}
            </p>
          </div>
          <div className="rounded-xl border border-border bg-muted/30 p-4">
            <p className="text-sm font-bold text-muted-foreground mb-2">
              {isFr ? "Le bricolage" : "DIY tools"}
            </p>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {isFr
                ? "Google Forms + Eventbrite + WhatsApp + tableurs. On se débrouille, on perd son audience."
                : "Google Forms + Eventbrite + WhatsApp + spreadsheets. You get by, but you lose your audience."}
            </p>
          </div>
        </div>
      </section>

      <hr className="border-border" />

      {/* ── Section 3 — La réponse ── */}
      <section className="space-y-6">
        <h2 className="text-2xl font-bold tracking-tight">
          {isFr ? "La réponse" : "The answer"}
        </h2>
        <p className="text-[17px] leading-relaxed text-muted-foreground">
          {isFr
            ? "The Playground part d'une idée simple."
            : "The Playground starts from a simple idea."}
        </p>

        <ul className="space-y-3">
          {(isFr
            ? [
                ["La ", "communauté", " est l'entité centrale — pas l'événement."],
                ["L'", "événement", " est une porte d'entrée virale."],
                ["S'inscrire à un événement rend ", "automatiquement", " membre de la communauté."],
                ["La ", "communauté persiste", " entre les événements."],
              ]
            : [
                ["The ", "community", " is the core entity — not the event."],
                ["The ", "event", " is a viral entry point."],
                ["Joining an event ", "automatically", " makes you a community member."],
                ["The ", "community persists", " between events."],
              ]
          ).map(([before, bold, after], i) => (
            <li key={i} className="flex items-start gap-3 text-[17px] leading-relaxed text-muted-foreground">
              <span className="mt-1 flex size-5 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-pink-500 to-violet-500">
                <CheckIcon className="size-3 text-white stroke-[3]" />
              </span>
              <span>
                {before}
                <strong className="bg-gradient-to-r from-pink-500 to-violet-500 bg-clip-text text-transparent font-bold">
                  {bold}
                </strong>
                {after}
              </span>
            </li>
          ))}
        </ul>

        <p className="text-[17px] leading-relaxed text-muted-foreground">
          {isFr
            ? "Le modèle communautaire de Meetup + l'expérience de Luma + 100% gratuit. Pas d'abonnement, pas de commission plateforme."
            : "Meetup's community model + Luma's experience + 100% free. No subscription, no platform commission."}
        </p>
      </section>

      <hr className="border-border" />

      {/* ── Section 4 — Où on en est ── */}
      <section className="space-y-5">
        <h2 className="text-2xl font-bold tracking-tight">
          {isFr ? "Où on en est" : "Where we are"}
        </h2>

        <div className="rounded-xl border border-primary/20 bg-primary/5 p-6 space-y-4">
          <p className="text-[17px] leading-relaxed text-muted-foreground">
            {isFr
              ? "La V0 tourne : multi-communautés, création d'événements, inscriptions, liste d'attente, gestion des participants, emails de confirmation. Bilingue FR/EN."
              : "V0 is live: multi-communities, event creation, registrations, waitlist, participant management, confirmation emails. Bilingual FR/EN."}
          </p>
          <p className="text-[17px] leading-relaxed text-muted-foreground">
            {isFr ? (
              <>
                Je réfléchis à ouvrir ça à un cercle restreint pour avoir des
                retours réels. Si tu organises des événements et que ça
                t'intéresse,{" "}
                <a
                  href="mailto:dragos@thespark.fr"
                  className="text-primary font-semibold hover:underline"
                >
                  dis-le moi
                </a>
                .
              </>
            ) : (
              <>
                I'm thinking about opening this to a small group for real
                feedback. If you organize events and this interests you,{" "}
                <a
                  href="mailto:dragos@thespark.fr"
                  className="text-primary font-semibold hover:underline"
                >
                  let me know
                </a>
                .
              </>
            )}
          </p>
        </div>

        <div className="flex justify-end">
          <Link
            href="/changelog"
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground hover:border-foreground/20 transition-colors"
          >
            {isFr ? "Voir le changelog" : "View changelog"}
            <span aria-hidden>→</span>
          </Link>
        </div>

        <p className="text-sm italic text-muted-foreground">
          {isFr
            ? "The Playground est développé en solo, propulsé par la curiosité et trop de café."
            : "The Playground is built solo, powered by curiosity and too much coffee."}
        </p>
      </section>

    </div>
  );
}
