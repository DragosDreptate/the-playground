---
title: "What I Learned Building The Playground with Claude Code"
description: "A Product Builder's story from the trenches. Two months, 1,780 commits, not a single line of code typed by hand: a field report on building a SaaS solo with an AI."
date: "2026-04-17"
author: "Dragos Dreptate"
keywords:
  - claude code
  - AI
  - product builder
  - field report
  - solo saas build
  - hexagonal architecture
  - ai agents
---

*A Product Builder's story from the trenches.*

## What I built, in brief

February 19, 2026, 7:53pm: first commit, an `Initial commit: Next.js 16 + Auth.js v5 + Prisma 7 + i18n`.

April 16, 2026, 10:23pm: `docs(spec): add Proposed status spec and Community voting on an event`.

Two months exactly. Between the two, [The Playground](https://the-playground.fr): a free platform to run communities around events, **built in France, open-source on GitHub, deployed on European servers**. Meetup's community model, Luma's premium experience, free, zero commission. Live in production, with its first users, communities and events.

1,780 commits, 373 PRs, 64,000 lines, 110 test files, 10 versions shipped, strict hexagonal architecture. Stack: Next.js 16, Auth.js v5, Prisma 7 + Neon, Stripe Connect, Resend, Sentry, PostHog, Vercel. One developer, evenings and weekends.

All of it built with [Claude Code](https://claude.com/claude-code). I never typed a single line of code. I never read what it wrote either. What checks the code is not my human eye, it's a chain of agents and tools.

That's the heart of the story that follows.

---

## Day 1: nine commits for a solid foundation

The first evening, in less than four hours, the platform was deployed on Vercel with:

- Next.js 16 App Router
- Auth.js v5 configured with magic link
- Prisma 7 connected to Neon PostgreSQL serverless
- Tailwind 4 + shadcn/ui
- next-intl for FR/EN bilingualism

None of these components is trivial to wire together. Each has its pitfalls. Auth.js v5 is still unstable, Prisma 7 changes the runtime for Vercel, next-intl enforces a precise routing structure, Neon requires a specific serverless adapter.

Without AI, this first evening would have taken a week. Not because each piece is individually hard. Because it's hard **together**, and each config mistake costs you an hour of documentation and stack traces to decode.

With AI, it becomes a dialogue. I describe what I want, it proposes, we adjust. When Vercel fails at deploy because `@prisma/client` isn't in the right dependencies, it spots it before I do in the logs. When Neon demands a specific adapter for the serverless runtime, it knows the name.

And since the foundation was in place, the evening didn't stop there. Before midnight, the first two business features were written: the `Circle` (Communities) CRUD at 9:42pm, the `Moment` (events) CRUD at 11:37pm. With shareable public pages, forms, validations. All of it on the project's first real hexagonal architecture.

> **First lesson:** the barrier to entry for a new project has collapsed. What used to take weeks now takes hours. But that says nothing about what comes next.

---

## Claude Code's real role: not a copilot, a demanding partner

There's an image that circulates a lot about AI and code. The "copilot". You type a few lines, the AI completes the rest. Autocomplete on steroids.

That's not how I worked.

Claude Code, in its CLI version, doesn't do autocomplete. It's an agent. You give it an objective, it reads the code, asks questions, plans, executes, verifies. When it's wrong, it self-corrects. When you're wrong, it flags it.

A concrete example. Feature "Community Networks" (v2.6.0). An evening of building, a Tuesday, 9pm to 10:30pm. When the PR opens, the diff is split into three commits by layer:

```
feat(network): add CircleNetwork schema, domain model, ports and usecases
feat(network): add Prisma adapter and admin server actions
feat(network): add public page, badge, admin pages and i18n
```

Domain, infrastructure, UI. Three layers, three commits. It's not that the agent writes in this order line by line, it's that the diff is *thought* in this order. The hexagonal separation is inscribed in the final artifact, reviewable, versionable.

Then comes the rest of the evening: unit and E2E tests, a few `fix(network)` UX tweaks, a `refactor(network)` that cleans things up, the help page update. At 10:30pm, merge. It's not a raw speed feat, it's the rhythm of a pair that respects an architecture. The AI knows how to read a `CLAUDE.md` that imposes hexagonal, it knows not to start with the UI, it knows a usecase shouldn't import Prisma. Layers stack in the right order because the order is written down, black on white, in the project's rules.

When I drift (for example, I ask for a shortcut that would violate layer separation), it flags it. It explains why that would be a problem later, and proposes the alternative that respects the contract.

> **Second lesson:** a well-framed AI agent doesn't just execute blindly. It helps you hold your own rules when fatigue would push you to bend them.

---

## Architecture as guardrail: AI amplifies debt as much as it amplifies velocity

Here's what no one says loud enough.

**AI doesn't simplify system complexity. It amplifies it.**

If the frame is fuzzy, you generate 10x more fuzzy code, 10x faster. Two weeks in, your project is an unreadable wasteland and every modification breaks three others.

If the frame is clear, you generate 10x more clean code, 10x faster. Two months in, you have a SaaS that holds together.

At my end, the frame is called hexagonal architecture. A discipline I imposed from day 1. The domain depends on nothing. Ports are TypeScript interfaces. Adapters implement ports. Usecases orchestrate.

The project's `CLAUDE.md` file is 600 lines long. It contains:

- Product vision and business rules
- Strict hexagonal contract (which layer can import which)
- Design system rules (button variants, sizes, tokens)
- Testing strategy (BDD lightweight, test.each for spec by example)
- Dated architectural decisions

This file is read by the AI every session. It's a moral contract between me and the agent. It pins down the invariants I want to preserve even when I'm tired at 11pm and tempted to cobble together a quick fix.

The commits show it. Almost systematically, a feature ends with a `refactor(...)` commit that cleans up what was just produced. It has become a reflex imposed by the agent's long-term memory: after each implementation, re-read the produced code and simplify.

It's not optional. It's a rule.

> **Third lesson:** the frame you set before the first commit decides what the project will be at commit 1,780. AI won't give you that for free, it only replicates what's already there.

---

## Long-term memory, or how not to repeat the same mistakes

Claude Code maintains a persistent memory directory. Markdown files the agent writes for itself, and re-reads at the start of every session.

My directory currently contains about twenty files, each dedicated to a precise topic. Examples:

- `feedback_workflow_git.md`: systematic branching rules (one branch per feature, never commit direct to main, PRs with conventional title).
- `feedback_accents_agents.md`: reminder that all written French must carry its accents.
- `feedback_tests_never_red.md`: never leave a test red, even if flaky.
- `feedback_release_process.md`: the full checklist for versioning with Release Please.
- `feedback_email_content_separation.md`: every email must separate content (editable `.md`) and React template.

Each file was born from a mistake. The first time it was made, I flagged it. The agent created the file. The next times, it reads it before acting. The mistake stops repeating.

It's the equivalent of continuous onboarding for a teammate who never leaves the team.

More interesting still: this mechanism forced me to **formalize my own rules**. When I get annoyed because the agent took a shortcut, I ask myself: this rule, did I write it down anywhere? If not, it's my fault. I write the rule. Next time, it will be held.

Two months in, I have a living documentation of my engineering preferences that I had never taken the time to write down for myself.

> **Fourth lesson:** working with an AI agent is writing the code and the contract that governs how that code must be written, at the same time. They train each other.

---

## Product, spec, exploration: how we decide what to build

Up to now I've talked about code, architecture, tests. That's half the subject.

The other half, the one people talk about even less when they talk about AI, is **the upstream work**. How you decide what to build, how you explore a fuzzy idea, how you turn it into something executable. That's the territory of product, spec, mockups, backlog. And that's where AI changes the craft as much, maybe more, than on the code side.

On The Playground, no significant feature arrived straight into implementation. Every time, there was an **exploratory cycle** before the first line of code. And in that cycle, the agent plays an active role.

**1. The exploratory conversation.**

I show up with a fuzzy idea, often poorly framed. A real example: "we should be able to group several Communities under a common page, something like a federation". The agent doesn't jump on code. It asks questions: who would need this? what concrete cases do you have in mind? what alternatives exist (Meetup Pro, Eventbrite Organization)? what impact on the data model? what potential tensions with existing Communities?

After 20 to 30 minutes of dialogue, the fuzzy idea has become a clear scope. That scope isn't arbitrary: it has been sculpted by questions I would have asked myself alone, but more slowly, and often after already having had useless code built.

**2. The HTML mockup as intermediate artifact.**

Before any implementation, I ask the agent for an **interactive HTML mockup**. A self-contained `.mockup.html` file, inline Tailwind, clickable navigation. Not a wireframe, a precise visual, pixel-accurate, showing what the user would see.

It sounds trivial. It's fundamental. An HTML mockup forces decisions on details invisible in a textual spec: visual hierarchy, field order, empty states, error states, mobile behavior. And since the agent produces it in minutes, the cost of iteration is zero. I sometimes go through three versions before validating one. What would have taken a day with an external designer takes an hour.

The mockup then becomes the **shared reference** for implementation. The agent that codes reads the mockup. I don't need to describe the UI in a ticket, it's already expressed.

**3. The markdown spec, written by the agent from the conversation.**

Once the scope is clarified and the mockup is validated, I ask the agent to **write the spec** in a markdown file under `spec/`. It synthesizes the conversation, structures the sections (context, problem, solution, technical impacts, risks, steps), lists decisions with their reasoning.

I re-read the spec (yes, that I re-read, because it's intent text, not code), I correct what doesn't reflect my thinking, I add what's missing. Often very little. The agent has captured the exchange well.

The spec becomes the reference document for next sessions, which can be days apart. Without a spec, the agent would forget context. With a spec, it picks up exactly where we left off.

**4. The living backlog.**

In parallel, a `BACKLOG.md` centralizes all upcoming ideas, prioritized P0/P1/P2, with for each entry the problem targeted, the envisioned scope, and the status. The agent reads the backlog, can propose groupings, flag dependencies between entries, suggest splits.

The backlog isn't an external tool like Linear or Jira. It's a file in the repo, versioned, read-write accessible to the agent. It updates at the pace of user feedback and trade-offs. It becomes the project's product memory, always consultable.

**5. The "a question is not an instruction" discipline.**

A hard rule, born from several frustrations: when I ask a question ("should we be able to mark an event as proposed before it's published?"), the agent does **not** interpret it as an instruction to implement. It analyzes the impact, presents the trade-offs, asks for confirmation before writing a single line.

It sounds obvious. In practice, without this explicit rule, an eager agent jumps on implementation at the first signal. And you end up with 200 lines of code on a feature you hadn't yet decided to build.

This rule turns the conversation into a real **product workshop**. I explore without risk. I can say "what if we did X?" without worrying that X is already half-coded when I want to back out.

> **Fifth lesson:** AI doesn't just replace technical execution. It also replaces part of the product management work: reformulating fuzzy ideas, rapid production of intermediate artifacts (mockups, specs), maintaining a living product memory. The CPO or CPTO who wants to understand where their craft is headed should pay close attention. Product itself doesn't get delegated to AI, but its **shaping** changes radically. It's the birth of a new role, the Product Builder.

---

## What AI does badly

Not everything is rosy. There are classes of problems where AI consistently slips. Here are three, lived firsthand.

**1. The blind spot on side effects.**

When you ask "add a `website` field to the Community", the AI does it cleanly: migration, form, validation, display on the page. But it won't on its own update the twelve other places where this field should appear: the invitation email, the CSV export, the public API, French and English translations, the help page, the sitemap, the SEO structured data, the Host dashboard. It reasons locally, well. It reasons cross-cuttingly, badly.

That's precisely why we have dedicated agents that sweep behind, each specialized on a cross-cutting axis: `docs-coherence-guardian` for doc/code coherence, `i18n-guardian` for keys forgotten between `fr.json` and `en.json`, `test-coverage-guardian` for missing E2E paths. Without this chain, side effects pile up silently. With it, they become visible and get fixed on the next PR.

Corollary: **AI is formidable at solving well-framed problems, mediocre at grasping the real scope of a change**. Human work is not to re-read the code, but to design the agents that hunt what the main agent wouldn't have caught.

**2. Silent over-engineering.**

Without a contrary instruction, it adds defense in depth: redundant validations, try/catch everywhere, fallbacks for cases that will never occur. The code works, but it bloats.

An explicit rule in `CLAUDE.md` was needed:

> Never add error handling, fallback or validation for scenarios that cannot happen. Trust the internal code and framework guarantees. Only validate at the system boundaries (user input, external APIs).

With this rule, the code slimmed down. Without it, it grew with every feature.

**3. Hallucinations on recent libraries.**

Next.js 16, Auth.js v5, Prisma 7. Three stack pillars, all recently released. The AI sometimes invents APIs that don't exist, or that existed in a previous version. I don't see it by re-reading, since I don't re-read. I see it in two places: the CI that fails on typecheck or build, and the review agents that run on the PR. Those two layers are enough, in the vast majority of cases, to surface the hallucination before merge.

When a doubt remains on a "too magical" API, I don't dive into the code. I ask the agent to point to the official documentation, precise version. If it can't, that's probably because it doesn't exist, and we correct.

> **Sixth lesson:** AI doesn't relieve you from controlling, but control shifts. What used to be line-by-line human reading becomes a system of automated checks: strict CI, tests, specialized review agents, observability. The developer industrializes mistrust instead of exercising it by hand.

---

## The agents that check the other agents

This is a topic that, in my view, is fundamental and completely changes the game.

When the AI writes 100% of the code and I don't re-read it by hand, the question becomes: who guarantees that what ships to prod is sound? The answer isn't "trust". The answer is a **chain of specialized agents and tools**, each with a clear responsibility on a precise axis.

On The Playground, this chain looks like:

- **`security-guardian`**: security audit across 6 dimensions (RBAC, IDOR, CSRF, CSP, input validation, GDPR, CI/CD, secrets). Run regularly, and systematically after any sensitive feature.
- **`performance-guardian`**: N+1 query detection, missing indexes, JS bundle regressions, Core Web Vitals issues.
- **`test-coverage-guardian`**: checks usecase and E2E coverage, creates missing tests.
- **`i18n-guardian`**: detects hardcoded text in French or English, desynchronized keys between `fr.json` and `en.json`, missing namespaces.
- **`docs-coherence-guardian`**: audits coherence between documentation, help page, and the actual state of the code. Updates drifted documents.
- **`dast-runner`**: automatic OWASP ZAP scan on preview and prod.

These agents are specialized, run on demand or in CI, and they produce reports that the main agent can then exploit to fix. A guardian that finds a vulnerability is a new task for Claude Code. A guardian that finds hardcoded text is a chained i18n correction.

To that, add the classic layers, made stricter by the "code isn't re-read" rule:

- **Strict TypeScript** everywhere, blocking typecheck in CI.
- **Vitest**: 86 unit test files (domain + usecases with mocked ports, BDD lightweight in native Given/When/Then).
- **Playwright**: 24 E2E scenarios that replay critical paths (event signup, Stripe payment, waitlist, check-in).
- **axe-core** integrated into Playwright for accessibility.
- **Lighthouse CI** on event pages (the viral unit, must be fast).
- **pnpm audit** in CI to catch CVEs in dependencies.
- **Sentry + PostHog** to catch whatever slips through to production.

What this chain enables: I can ship a feature at 11pm without having read a single line of the diff, merge it the next morning, and sleep easy. Not because I trust the agent that wrote. Because I trust the **other agents** that checked after it, each on their axis.

> **Seventh lesson:** you don't replace human re-reading with nothing. You replace it with a system of specialized agents whose role is precisely to find what the main agent didn't catch. Human work becomes the design of that chain, not its execution.

---

## Observability: the last line of defense

Something people talk about too little: an AI-built project only really works if **the feedback loop is near real-time**.

My observability stack:

- **Vercel** for deployment. Every PR gets a preview URL, every merge deploys to prod.
- **Sentry** for errors. Every production exception arrives with full stack trace.
- **PostHog** for product. Who does what, how long, at what point they leave.
- **Slack** for critical signals (new signup, new comment, admin alerts).

When a feature ships, I see within minutes whether it breaks, whether it's used, whether it creates friction. Sentry surfaces a spike of exceptions on a given component, PostHog shows me a button that's seen but not clicked, or clicked and then abandoned right after.

With this loop, the AI becomes a fast-correction executor. I see, I describe, it fixes, we ship. In an hour, a bug spotted at 9am is fixed in prod at 10am.

Without this loop, AI would produce code in a vacuum. It's observability, paired with real-time monitoring, that gives meaning to iterations.

> **Eighth lesson:** observability is no longer a luxury, it's an AI multiplier. Your agent is only useful if you can tell it, with numbers, what works and what doesn't.

---

## What remains deeply human

Here's where I'm getting to.

Over two months, the AI wrote all the code. Really all of it. Not a single line typed by hand. And no line-by-line re-reading either. The only things I wrote myself are the prompts and, in part, the intent documents: specifications, marketing messages, product decisions.

But there are things it didn't do.

**It didn't decide what to build.**

The "community-centric" model that sets The Playground apart from Luma and Meetup is a product conviction. It comes from years running or taking part in communities, from having seen Meetup lock itself into its model, from having seen Luma shine on the event page and stop there. The AI couldn't have formulated that diagnosis. It translated it into code, very well. But the thesis is mine.

**It didn't listen to the users.**

There's [Chris Deniaud](https://www.linkedin.com/in/christophe-deniaud/), Host of Agile Bordeaux, the first active community on the platform, who reports concrete pain points from the field, at every event he runs. There's [Fatima](https://www.linkedin.com/in/fzhamil/), who tested the platform and shared detailed feedback on LinkedIn, bugs included. There's [Greg](https://www.linkedin.com/in/greg-lhotellier/), Host of [Dev With AI](https://www.devw.ai/) who explained why he hesitates to migrate from Luma, even though he wants to: his community of 800 members already built, the webhooks of his automation already in place, the free discoverability Luma gives him. There's [La Grappe Numérique](https://www.lagrappenumerique.fr/#/), a network of Bordeaux communities, whose invitation to pitch gave birth to the Networks feature I described earlier.

Those feedback loops, I sought them out, listened to them, digested them. I decided which ones to turn into priority features and which ones to defer.

**It didn't arbitrate tensions.**

Free 100% product or take a 1% commission to sustain it? Open public discovery or reserve it to invited communities? Require sign-in or allow anonymous exploration? These trade-offs came from conversations with users, personal hesitations, sleepless nights. AI helps explore trade-offs. It doesn't rule.

> **Ninth lesson:** AI hasn't replaced the developer or the product manager. It has replaced the "typing code" part, a big chunk of the verification, and a good half of the product shaping (specs, mockups, backlog). It hasn't replaced the vision, the listening to users, the strategic calls. What was rare before AI has become even rarer, and even more precious.

---

## What this changes for those who code

I'm saving the last observation for the end.

For a long time, the senior developer was the one who knew how to write clean code in complex systems. That was their capital.

That capital isn't worth much anymore. Or rather, it's still worth something, but for a very different reason and under a different hat, that of Product Builder. They know how to **judge decisions** in a complex system. They know how to say "that abstraction is premature", "that test tests nothing", "that optimization will cost us dearly in readability", "that dependency will lock us in six months from now".

The Product Builder becomes an **architect of an agent system**. They build the frame in which agents work: written rules, architectural contracts, test guardrails, specialized review agents, observability loops. They orient execution, they arbitrate product and technical trade-offs. Writing and re-reading are delegated. Structuring intelligence stays with them.

What I lived these two months is that passage. From day one, I forbade myself from writing a single line of code or re-reading one by hand. Not out of ideology, but because every time I would have been tempted to "take back control" by typing myself, I'd have missed the chance to formalize the rule that would have prevented the problem from recurring. Depriving myself of the keyboard forces me to write the rule. Next time, the agent holds it alone, and another agent verifies it has been held.

Today, at the 373rd merged PR, I don't see myself working any other way. Not because it's faster (even though it is). Because it's **intellectually more right**. I spend my time deciding, arbitrating, listening to users, formulating questions, connecting signals. Not typing or re-reading code.

---

## What I don't know yet

I want to be honest about the scope.

This is a **solo** experiment. I haven't tested this method with three developers, let alone thirty. How does the `CLAUDE.md` get shared across several hands? How do you keep the rules alive when everyone has their own style? How does a new joiner catch up? I don't know.

It's an experiment over **two months**. A fresh SaaS, built in one stretch, with an architecture I laid down myself on day 1. I don't know what this method gives on a 5-year-old legacy monolith, with 10 years of debt, modules no one understands anymore and test coverage capped at 20%. My gut says it works there too, but only after a significant upfront work of documentation and delimitation. I have no proof.

It's an experiment on a **modern stack** (Next.js, Prisma, Auth.js, Vercel). The AI knows these tools. It would probably be more hesitant on COBOL, SAP ABAP, enterprise Ruby on Rails 3.2. I haven't tested.

And it's the experiment of a developer with twenty-five years of craft behind him. My architectural intuition, the one that lets me judge in three seconds whether an agent's proposal holds or drifts, comes from there. I don't know what this method would look like for a junior starting out. Maybe it works too, with a different frame. Maybe not.

Take it as that: the field report of a solo, over two months, on a fresh product, with a modern stack, by someone who has already coded a lot before. Every parameter matters.

---

## In conclusion

Two months, 1,780 commits, a SaaS platform in production. One developer. Evenings and weekends.

This isn't a feat. It's the new normal for anyone who wants to take it seriously.

What made it possible:

- An architectural frame set before the first line
- Written rules, alive, improved at every mistake
- A real-time feedback loop (deployment, error monitoring, product observability)
- A chain of review agents that industrializes mistrust in place of human re-reading
- A product conviction that precedes the technical work, nourished by real user feedback

What used to matter and doesn't anymore:

- Raw development skills
- Up-to-date knowledge of languages and frameworks
- Memory of patterns

What remains rare, and what will keep being rare, is **knowing what to build, for whom, and why**.

AI gives the tools to those who have the vision. It doesn't give the vision to those who have the tools.

The Playground is live. If you run a community, I'd be glad to have you take a look.

→ [the-playground.fr](https://the-playground.fr)

And for those who want to see how it's made, the repo is public on [GitHub](https://github.com/DragosDreptate/the-playground).
