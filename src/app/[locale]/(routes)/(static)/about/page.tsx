import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { getAppUrl } from "@/lib/app-url";
import {
  CheckIcon,
  Github,
  Star,
  Users,
  CalendarCheck,
  Bell,
  CreditCard,
  MessageCircle,
  ListChecks,
  Globe,
  Radar,
} from "lucide-react";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("About");
  const appUrl = getAppUrl();
  return {
    title: t("pageTitle"),
    description: t("pageDescription"),
    alternates: {
      canonical: `${appUrl}/about`,
      languages: {
        fr: `${appUrl}/about`,
        en: `${appUrl}/en/about`,
      },
    },
    openGraph: {
      title: t("pageTitle"),
      description: t("pageDescription"),
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
              ? "Construit avec Claude Code · The Playground"
              : "Built with Claude Code · The Playground"}
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
            ? "Un prétexte pour explorer Claude Code — l'outil de développement IA d'Anthropic — sur un vrai projet avec de vraies contraintes. Quelques jours plus tard, j'avais un MVP fonctionnel. Quelques semaines plus tard, une plateforme complète en production — avec ses communautés, ses événements, ses utilisateurs."
            : "A pretext to explore Claude Code — Anthropic's AI development tool — on a real project with real constraints. A few days later, I had a working MVP. A few weeks later, a full platform in production — with real communities, events, and users."}
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

        {/* ── Fonctionnalités concrètes ── */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 pt-2">
          {(isFr
            ? [
                { icon: Users, label: "Communautés persistantes", desc: "Membres, rôles, invitations par lien" },
                { icon: CalendarCheck, label: "Événements partageables", desc: "Pages autonomes, brouillons, ajout calendrier" },
                { icon: Bell, label: "Notifications automatiques", desc: "Confirmations, rappels, mises à jour" },
                { icon: CreditCard, label: "Billetterie intégrée", desc: "Paiements via Stripe, 0% commission plateforme" },
                { icon: MessageCircle, label: "Commentaires", desc: "Fil de discussion sur chaque événement" },
                { icon: ListChecks, label: "Liste d'attente", desc: "Promotion automatique sur désistement" },
                { icon: Globe, label: "Explorer", desc: "Répertoire public de communautés" },
                { icon: Radar, label: "Radar IA", desc: "Détection d'événements similaires via Claude" },
              ]
            : [
                { icon: Users, label: "Persistent communities", desc: "Members, roles, invite links" },
                { icon: CalendarCheck, label: "Shareable events", desc: "Standalone pages, drafts, calendar sync" },
                { icon: Bell, label: "Automated notifications", desc: "Confirmations, reminders, updates" },
                { icon: CreditCard, label: "Built-in ticketing", desc: "Stripe payments, 0% platform fee" },
                { icon: MessageCircle, label: "Comments", desc: "Discussion thread on every event" },
                { icon: ListChecks, label: "Waitlist", desc: "Auto-promotion on cancellation" },
                { icon: Globe, label: "Explore", desc: "Public community directory" },
                { icon: Radar, label: "AI Radar", desc: "Similar event detection via Claude" },
              ]
          ).map(({ icon: Icon, label, desc }) => (
            <div
              key={label}
              className="flex items-start gap-3 rounded-lg border border-border bg-muted/30 px-4 py-3"
            >
              <Icon className="size-5 shrink-0 text-primary mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-foreground">{label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
              </div>
            </div>
          ))}
        </div>
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
                    className="text-foreground font-semibold hover:text-primary dark:hover:text-[oklch(0.76_0.27_341)] transition-colors"
                  >
                    Dragos Dreptate
                  </a>
                  . Dirigeant, entrepreneur et coach — 25 ans dans la tech,
                  basé à Paris. J'ai fondé{" "}
                  <a
                    href="https://thespark.fr"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-foreground font-semibold hover:text-primary dark:hover:text-[oklch(0.76_0.27_341)] transition-colors"
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
                    className="text-foreground font-semibold hover:text-primary dark:hover:text-[oklch(0.76_0.27_341)] transition-colors"
                  >
                    Dragos Dreptate
                  </a>
                  . Executive, entrepreneur and coach — 25 years in tech,
                  based in Paris. I founded{" "}
                  <a
                    href="https://thespark.fr"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-foreground font-semibold hover:text-primary dark:hover:text-[oklch(0.76_0.27_341)] transition-colors"
                  >
                    The Spark
                  </a>
                  , a consulting firm specializing in AI, Product and Innovation.
                </>
              )}
            </p>
            <p>
              {isFr
                ? "Depuis des années, j'organise des événements — conférences produit, masterclasses, événements internes ou dans la communauté agile. C'est ce vécu d'organisateur, confronté aux mêmes outils bancals en boucle, qui est à l'origine de The Playground."
                : "For years, I've been running events — product conferences, masterclasses, internal events and agile community meetups. That experience as an organizer, running into the same broken tools over and over, is what sparked The Playground."}
            </p>
            <p>
              {isFr ? (
                <>
                  Une question, une idée, envie d'échanger ?{" "}
                  <a
                    href="https://www.linkedin.com/in/dragosdreptate/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary font-semibold hover:text-foreground transition-colors"
                  >
                    Retrouvez-moi sur LinkedIn.
                  </a>
                </>
              ) : (
                <>
                  A question, an idea, want to connect?{" "}
                  <a
                    href="https://www.linkedin.com/in/dragosdreptate/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary font-semibold hover:text-foreground transition-colors"
                  >
                    Find me on LinkedIn.
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
            ? "Entièrement construit avec Claude Code (Anthropic). Architecture hexagonale, TypeScript strict, tout déployé en Europe."
            : "Entirely built with Claude Code (Anthropic). Hexagonal architecture, strict TypeScript, everything deployed in Europe."}
        </p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {[
            { name: "Next.js 16", desc: isFr ? "App Router, SSR/ISR" : "App Router, SSR/ISR" },
            { name: "TypeScript", desc: isFr ? "Strict, full-stack" : "Strict, full-stack" },
            { name: "PostgreSQL", desc: isFr ? "Neon serverless (EU)" : "Neon serverless (EU)" },
            { name: "Prisma", desc: isFr ? "ORM + migrations" : "ORM + migrations" },
            { name: "Auth.js v5", desc: isFr ? "Magic link + OAuth" : "Magic link + OAuth" },
            { name: "Tailwind + shadcn", desc: isFr ? "Design system" : "Design system" },
            { name: "Stripe Connect", desc: isFr ? "Paiements sécurisés" : "Secure payments" },
            { name: "Resend", desc: isFr ? "Emails transactionnels" : "Transactional emails" },
            { name: "Sentry", desc: isFr ? "Monitoring d'erreurs" : "Error monitoring" },
            { name: "Vercel", desc: isFr ? "Déploiement EU" : "Edge deployment (EU)" },
            { name: "PostHog", desc: isFr ? "Product analytics" : "Product analytics" },
            { name: "Claude Code", desc: isFr ? "Développement IA" : "AI-powered dev" },
            { name: "Anthropic SDK", desc: isFr ? "IA embarquée (Radar)" : "Embedded AI (Radar)" },
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

      {/* ── Section 6 — En chiffres ── */}
      <section className="space-y-6">
        <h2 className="text-2xl font-bold tracking-tight">
          {isFr ? "En chiffres" : "By the numbers"}
        </h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            { value: "1 900+", label: isFr ? "commits" : "commits" },
            { value: "390+", label: isFr ? "pull requests" : "pull requests" },
            { value: "80", label: isFr ? "cas d'usage" : "use cases" },
            { value: "1 010+", label: isFr ? "tests" : "tests" },
          ].map(({ value, label }) => (
            <div key={label} className="text-center">
              <p className="text-2xl font-extrabold tracking-tight bg-gradient-to-r from-pink-500 to-violet-500 bg-clip-text text-transparent">
                {value}
              </p>
              <p className="text-xs text-muted-foreground mt-1">{label}</p>
            </div>
          ))}
        </div>
      </section>

      <hr className="border-border" />

      {/* ── Section 7 — Code source ── */}
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
            <p className="font-semibold text-foreground group-hover:text-primary dark:group-hover:text-[oklch(0.76_0.27_341)] transition-colors">
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
