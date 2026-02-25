import type { Metadata } from "next";
import { getLocale } from "next-intl/server";
import { CheckIcon, Github, Star } from "lucide-react";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "À propos · The Playground",
    description:
      "L'histoire de The Playground — pourquoi, comment, et ce qui vient.",
    openGraph: {
      title: "À propos · The Playground",
      description:
        "L'histoire de The Playground — pourquoi, comment, et ce qui vient.",
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

      {/* ── Section 4 — Qui je suis ── */}
      <section className="space-y-5">
        <h2 className="text-2xl font-bold tracking-tight">
          {isFr ? "Qui je suis" : "About me"}
        </h2>
        <div className="flex items-start gap-4">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-pink-500 to-violet-500 text-white font-bold text-lg select-none">
            D
          </div>
          <div className="space-y-3 text-[17px] leading-relaxed text-muted-foreground">
            <p>
              {isFr ? (
                <>
                  Je m'appelle{" "}
                  <a
                    href="https://www.linkedin.com/in/dragosdreptate/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-foreground font-semibold hover:underline"
                  >
                    Dragos Dreptate
                  </a>
                  . Dirigeant, entrepreneur et coach — 25 ans dans la tech,
                  basé à Paris. J'ai fondé{" "}
                  <a
                    href="https://thespark.fr"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-foreground font-semibold hover:underline"
                  >
                    The Spark
                  </a>
                  , un cabinet de conseil en IA, Produit et Innovation.
                </>
              ) : (
                <>
                  I'm{" "}
                  <a
                    href="https://www.linkedin.com/in/dragosdreptate/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-foreground font-semibold hover:underline"
                  >
                    Dragos Dreptate
                  </a>
                  . Executive, entrepreneur and coach — 25 years in tech,
                  based in Paris. I founded{" "}
                  <a
                    href="https://thespark.fr"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-foreground font-semibold hover:underline"
                  >
                    The Spark
                  </a>
                  , a consulting firm specializing in AI, Product and Innovation.
                </>
              )}
            </p>
            <p>
              {isFr
                ? "Depuis des années, j'organise des événements — conférences tech, masterclasses leadership, communautés agiles. C'est ce vécu d'organisateur, confronté aux mêmes outils bancals en boucle, qui est à l'origine de The Playground."
                : "For years, I've been running events — tech conferences, leadership masterclasses, agile communities. That experience as an organizer, running into the same broken tools over and over, is what sparked The Playground."}
            </p>
            <p>
              {isFr ? (
                <>
                  Une question, une idée, envie d'essayer ?{" "}
                  <a
                    href="mailto:dragos@thespark.fr"
                    className="text-primary font-semibold hover:underline"
                  >
                    dragos@thespark.fr
                  </a>
                </>
              ) : (
                <>
                  A question, an idea, want to try it?{" "}
                  <a
                    href="mailto:dragos@thespark.fr"
                    className="text-primary font-semibold hover:underline"
                  >
                    dragos@thespark.fr
                  </a>
                </>
              )}
            </p>
          </div>
        </div>
      </section>

      <hr className="border-border" />

      {/* ── Section 5 — La stack ── */}
      <section className="space-y-6">
        <h2 className="text-2xl font-bold tracking-tight">
          {isFr ? "La stack" : "The stack"}
        </h2>
        <p className="text-[17px] leading-relaxed text-muted-foreground">
          {isFr
            ? "Construit en moins d'une semaine avec Claude Code (Anthropic). Architecture hexagonale, TypeScript strict, tout déployé en Europe."
            : "Built in under a week with Claude Code (Anthropic). Hexagonal architecture, strict TypeScript, everything deployed in Europe."}
        </p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {[
            { name: "Next.js 15", desc: isFr ? "App Router, SSR/ISR" : "App Router, SSR/ISR" },
            { name: "TypeScript", desc: isFr ? "Strict, full-stack" : "Strict, full-stack" },
            { name: "PostgreSQL", desc: isFr ? "Neon serverless (EU)" : "Neon serverless (EU)" },
            { name: "Prisma", desc: isFr ? "ORM + migrations" : "ORM + migrations" },
            { name: "Auth.js v5", desc: isFr ? "Magic link + OAuth" : "Magic link + OAuth" },
            { name: "Tailwind + shadcn", desc: isFr ? "Design system" : "Design system" },
            { name: "Resend", desc: isFr ? "Emails transactionnels" : "Transactional emails" },
            { name: "Vercel", desc: isFr ? "Déploiement EU" : "Edge deployment (EU)" },
            { name: "Claude Code", desc: isFr ? "Propulsé par l'IA" : "AI-powered dev" },
          ].map(({ name, desc }) => (
            <div
              key={name}
              className="rounded-lg border border-border bg-muted/30 px-3 py-2.5"
            >
              <p className="text-sm font-semibold text-foreground">{name}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      <hr className="border-border" />

      {/* ── Section 6 — Code source ── */}
      <section className="space-y-6">
        <h2 className="text-2xl font-bold tracking-tight">
          {isFr ? "Le code" : "The code"}
        </h2>
        <p className="text-[17px] leading-relaxed text-muted-foreground">
          {isFr
            ? "Curieux de voir comment c'est construit ? Le code source est sur GitHub."
            : "Curious about how it's built? The source code is on GitHub."}
        </p>
        <a
          href="https://github.com/DragosDreptate/the-playground"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-4 rounded-xl border border-border bg-card px-5 py-4 transition-colors hover:border-primary/40 hover:bg-primary/5 group"
        >
          <Github className="size-8 shrink-0 text-foreground" />
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-foreground group-hover:text-primary transition-colors">
              DragosDreptate / the-playground
            </p>
            <p className="text-sm text-muted-foreground truncate">
              github.com/DragosDreptate/the-playground
            </p>
          </div>
          <span className="flex items-center gap-1.5 shrink-0 text-sm text-muted-foreground">
            <Star className="size-4" />
            Star
          </span>
        </a>
      </section>



    </div>
  );
}
