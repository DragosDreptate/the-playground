import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { HelpSidebar } from "@/components/help/help-sidebar";
import { HelpFaqAccordion } from "@/components/help/help-faq-accordion";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Help");
  return {
    title: t("meta.title"),
    description: t("meta.description"),
    openGraph: {
      title: t("meta.title"),
      description: t("meta.description"),
    },
  };
}

function Strong({ children }: { children: React.ReactNode }) {
  return <strong className="font-semibold text-foreground">{children}</strong>;
}

function Code({ children }: { children: React.ReactNode }) {
  return (
    <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs text-foreground">
      {children}
    </code>
  );
}

function StepNumber({ n }: { n: number }) {
  return (
    <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">
      {n}
    </span>
  );
}

function Callout({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-r-lg border-l-[3px] border-primary bg-muted px-4 py-3 text-sm italic text-muted-foreground">
      {children}
    </div>
  );
}

function SectionH2({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <h2
      id={id}
      className="scroll-mt-24 text-xl font-bold tracking-tight text-foreground"
    >
      {children}
    </h2>
  );
}

function SectionH3({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <h3
      id={id}
      className="scroll-mt-24 text-base font-semibold text-foreground"
    >
      {children}
    </h3>
  );
}

export default async function HelpPage() {
  const t = await getTranslations("Help");

  const sidebarSections = [
    {
      id: "participant",
      label: t("sidebar.participant"),
      children: [
        { id: "inscription", label: t("sidebar.inscription") },
        { id: "rejoindre", label: t("sidebar.rejoindre") },
        { id: "waitlist", label: t("sidebar.waitlist") },
        { id: "cancel", label: t("sidebar.cancel") },
        { id: "comments", label: t("sidebar.comments") },
        { id: "mySpace", label: t("sidebar.mySpace") },
        { id: "notifications", label: t("sidebar.notifications") },
        { id: "leave", label: t("sidebar.leave") },
      ],
    },
    {
      id: "organizer",
      label: t("sidebar.organizer"),
      children: [
        { id: "createCommunity", label: t("sidebar.createCommunity") },
        { id: "createEvent", label: t("sidebar.createEvent") },
        { id: "manageRegistrations", label: t("sidebar.manageRegistrations") },
        { id: "contactParticipants", label: t("sidebar.contact") },
        { id: "editCancel", label: t("sidebar.editCancel") },
        { id: "radar", label: t("sidebar.radar") },
        { id: "share", label: t("sidebar.share") },
        { id: "members", label: t("sidebar.members") },
        { id: "inviteMembers", label: t("sidebar.inviteMembers") },
      ],
    },
    { id: "faq", label: t("sidebar.faqLabel"), children: [] },
  ];

  const faqItems = [
    { question: t("faq.q1.question"), answer: t("faq.q1.answer") },
    { question: t("faq.q2.question"), answer: t("faq.q2.answer") },
    { question: t("faq.q3.question"), answer: t("faq.q3.answer") },
    { question: t("faq.q4.question"), answer: t("faq.q4.answer") },
    { question: t("faq.q5.question"), answer: t("faq.q5.answer") },
    { question: t("faq.q6.question"), answer: t("faq.q6.answer") },
    { question: t("faq.q7.question"), answer: t("faq.q7.answer") },
  ];

  const rich = {
    strong: (chunks: React.ReactNode) => <Strong>{chunks}</Strong>,
    code: (chunks: React.ReactNode) => <Code>{chunks}</Code>,
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 md:py-16">
      {/* Hero */}
      <div className="mb-12 space-y-4 text-center">
        <h1 className="text-3xl font-extrabold tracking-tight md:text-4xl">
          {t("hero.title")}
        </h1>
        <p className="mx-auto max-w-2xl text-base leading-relaxed text-muted-foreground md:text-lg">
          {t("hero.subtitle")}
        </p>
        <div className="flex flex-wrap justify-center gap-3 pt-2">
          <a
            href="#participant"
            className="inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-4 py-1.5 text-sm font-semibold text-primary transition-colors hover:bg-primary/20"
          >
            {t("hero.ctaParticipant")}
          </a>
          <a
            href="#organizer"
            className="inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-4 py-1.5 text-sm font-semibold text-primary transition-colors hover:bg-primary/20"
          >
            {t("hero.ctaOrganizer")}
          </a>
        </div>
      </div>

      {/* Two-column layout */}
      <div className="flex gap-10">
        <HelpSidebar sections={sidebarSections} />

        <div className="min-w-0 flex-1 space-y-14">
          {/* ── Section Participant ── */}
          <section className="space-y-10">
            <div className="flex items-center gap-3">
              <SectionH2 id="participant">{t("participant.sectionTitle")}</SectionH2>
              <span className="rounded-full border border-primary/20 bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
                {t("participant.badge")}
              </span>
            </div>

            {/* S'inscrire */}
            <div className="space-y-4">
              <SectionH3 id="inscription">{t("participant.inscription.title")}</SectionH3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {t.rich("participant.inscription.intro", rich)}
              </p>
              <p className="text-sm font-medium text-foreground">
                {t("participant.inscription.stepsLabel")}
              </p>
              <ol className="space-y-3">
                {(["step1", "step2", "step3", "step4"] as const).map((step, i) => (
                  <li key={step} className="flex items-start gap-3">
                    <StepNumber n={i + 1} />
                    <span className="text-sm leading-relaxed text-muted-foreground">
                      {t.rich(`participant.inscription.${step}`, rich)}
                    </span>
                  </li>
                ))}
              </ol>
              <Callout>{t("participant.inscription.callout")}</Callout>
            </div>

            <hr className="border-border" />

            {/* Rejoindre */}
            <div className="space-y-4">
              <SectionH3 id="rejoindre">{t("participant.join.title")}</SectionH3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {t("participant.join.intro")}
              </p>
              <p className="text-sm font-medium text-foreground">
                {t("participant.join.memberLabel")}
              </p>
              <ul className="space-y-2">
                {(["item1", "item2", "item3", "item4"] as const).map((item) => (
                  <li key={item} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" />
                    {t.rich(`participant.join.${item}`, rich)}
                  </li>
                ))}
              </ul>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {t.rich("participant.join.outro", rich)}
              </p>
            </div>

            <hr className="border-border" />

            {/* Waitlist */}
            <div className="space-y-4">
              <SectionH3 id="waitlist">{t("participant.waitlist.title")}</SectionH3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {t.rich("participant.waitlist.intro", rich)}
              </p>
            </div>

            <hr className="border-border" />

            {/* Annuler */}
            <div className="space-y-4">
              <SectionH3 id="cancel">{t("participant.cancel.title")}</SectionH3>
              <p className="text-sm font-medium text-foreground">
                {t.rich("participant.cancel.stepsLabel", rich)}
              </p>
              <ol className="space-y-3">
                {(["step1", "step2"] as const).map((step, i) => (
                  <li key={step} className="flex items-start gap-3">
                    <StepNumber n={i + 1} />
                    <span className="text-sm leading-relaxed text-muted-foreground">
                      {t.rich(`participant.cancel.${step}`, rich)}
                    </span>
                  </li>
                ))}
              </ol>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {t("participant.cancel.outro")}
              </p>
            </div>

            <hr className="border-border" />

            {/* Commentaires */}
            <div className="space-y-4">
              <SectionH3 id="comments">{t("participant.comments.title")}</SectionH3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {t.rich("participant.comments.intro", rich)}
              </p>
            </div>

            <hr className="border-border" />

            {/* Mon espace */}
            <div className="space-y-4">
              <SectionH3 id="mySpace">{t("participant.mySpace.title")}</SectionH3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {t.rich("participant.mySpace.intro", rich)}
              </p>
              <ul className="space-y-2">
                {(["item1", "item2", "item3", "item4"] as const).map((item) => (
                  <li key={item} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" />
                    {t.rich(`participant.mySpace.${item}`, rich)}
                  </li>
                ))}
              </ul>
            </div>

            <hr className="border-border" />

            {/* Notifications */}
            <div className="space-y-4">
              <SectionH3 id="notifications">{t("participant.notifications.title")}</SectionH3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {t.rich("participant.notifications.intro", rich)}
              </p>
              <ul className="space-y-2">
                {(["item1", "item2", "item3", "item4"] as const).map((item) => (
                  <li key={item} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" />
                    {t(`participant.notifications.${item}`)}
                  </li>
                ))}
              </ul>
            </div>

            <hr className="border-border" />

            {/* Quitter */}
            <div className="space-y-4">
              <SectionH3 id="leave">{t("participant.leave.title")}</SectionH3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {t.rich("participant.leave.intro", rich)}
              </p>
            </div>
          </section>

          {/* ── Section Organisateur ── */}
          <section className="space-y-10">
            <div className="flex items-center gap-3">
              <SectionH2 id="organizer">{t("organizer.sectionTitle")}</SectionH2>
              <span className="rounded-full border border-primary/20 bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
                {t("organizer.badge")}
              </span>
            </div>

            {/* Créer sa Communauté */}
            <div className="space-y-4">
              <SectionH3 id="createCommunity">{t("organizer.createCommunity.title")}</SectionH3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {t("organizer.createCommunity.intro")}
              </p>
              <p className="text-sm font-medium text-foreground">
                {t("organizer.createCommunity.stepsLabel")}
              </p>
              <ol className="space-y-3">
                {(["step1", "step2", "step3", "step4"] as const).map((step, i) => (
                  <li key={step} className="flex items-start gap-3">
                    <StepNumber n={i + 1} />
                    <span className="text-sm leading-relaxed text-muted-foreground">
                      {t.rich(`organizer.createCommunity.${step}`, rich)}
                    </span>
                  </li>
                ))}
              </ol>
              <Callout>{t.rich("organizer.createCommunity.callout", rich)}</Callout>
            </div>

            <hr className="border-border" />

            {/* Créer un événement */}
            <div className="space-y-4">
              <SectionH3 id="createEvent">{t("organizer.createEvent.title")}</SectionH3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {t.rich("organizer.createEvent.intro", rich)}
              </p>
              <p className="text-sm font-medium text-foreground">
                {t("organizer.createEvent.essentialLabel")}
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                {(
                  [
                    ["field1Title", "field1Desc"],
                    ["field2Title", "field2Desc"],
                    ["field3Title", "field3Desc"],
                    ["field4Title", "field4Desc"],
                  ] as const
                ).map(([titleKey, descKey]) => (
                  <div
                    key={titleKey}
                    className="rounded-lg border border-border bg-muted/30 px-3 py-2.5"
                  >
                    <p className="text-sm font-semibold text-foreground">
                      {t(`organizer.createEvent.${titleKey}`)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {t(`organizer.createEvent.${descKey}`)}
                    </p>
                  </div>
                ))}
              </div>
              <p className="text-sm font-medium text-foreground">
                {t("organizer.createEvent.advancedLabel")}
              </p>
              <ul className="space-y-2">
                {(["adv1", "adv2", "adv3"] as const).map((adv) => (
                  <li key={adv} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" />
                    {t.rich(`organizer.createEvent.${adv}`, rich)}
                  </li>
                ))}
              </ul>
              <Callout>{t("organizer.createEvent.callout")}</Callout>
            </div>

            <hr className="border-border" />

            {/* Gérer les inscriptions */}
            <div className="space-y-4">
              <SectionH3 id="manageRegistrations">
                {t("organizer.manageRegistrations.title")}
              </SectionH3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {t("organizer.manageRegistrations.intro")}
              </p>
              <ul className="space-y-2">
                {(["item1", "item2", "item3", "item4"] as const).map((item) => (
                  <li key={item} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" />
                    {t.rich(`organizer.manageRegistrations.${item}`, rich)}
                  </li>
                ))}
              </ul>
            </div>

            <hr className="border-border" />

            {/* Contacter */}
            <div className="space-y-4">
              <SectionH3 id="contactParticipants">{t("organizer.contact.title")}</SectionH3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {t.rich("organizer.contact.intro", rich)}
              </p>
            </div>

            <hr className="border-border" />

            {/* Modifier ou annuler */}
            <div className="space-y-4">
              <SectionH3 id="editCancel">{t("organizer.editCancel.title")}</SectionH3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {t("organizer.editCancel.intro")}
              </p>
              <ul className="space-y-2">
                {(["item1", "item2"] as const).map((item) => (
                  <li key={item} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" />
                    {t.rich(`organizer.editCancel.${item}`, rich)}
                  </li>
                ))}
              </ul>
              <Callout>{t("organizer.editCancel.callout")}</Callout>
            </div>

            <hr className="border-border" />

            {/* Le Radar */}
            <div className="space-y-4">
              <SectionH3 id="radar">{t("organizer.radar.title")}</SectionH3>
              <div className="rounded-xl border border-primary/18 bg-gradient-to-br from-primary/7 to-primary/5 p-4 space-y-3">
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {t.rich("organizer.radar.intro", rich)}
                </p>
                <p className="text-sm font-semibold text-foreground">
                  {t.rich("organizer.radar.limit", rich)}
                </p>
              </div>
            </div>

            <hr className="border-border" />

            {/* Partager */}
            <div className="space-y-4">
              <SectionH3 id="share">{t("organizer.share.title")}</SectionH3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {t.rich("organizer.share.intro", rich)}
              </p>
            </div>

            <hr className="border-border" />

            {/* Membres */}
            <div className="space-y-4">
              <SectionH3 id="members">{t("organizer.members.title")}</SectionH3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {t.rich("organizer.members.intro", rich)}
              </p>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {t("organizer.members.outro")}
              </p>
            </div>

            <hr className="border-border" />

            {/* Inviter des membres */}
            <div className="space-y-4">
              <SectionH3 id="inviteMembers">{t("organizer.inviteMembers.title")}</SectionH3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {t.rich("organizer.inviteMembers.intro", rich)}
              </p>
              <ol className="space-y-3">
                {(["step1", "step2", "step3", "step4"] as const).map((step, i) => (
                  <li key={step} className="flex items-start gap-3">
                    <StepNumber n={i + 1} />
                    <span className="text-sm leading-relaxed text-muted-foreground">
                      {t.rich(`organizer.inviteMembers.${step}`, rich)}
                    </span>
                  </li>
                ))}
              </ol>
              <Callout>{t.rich("organizer.inviteMembers.callout", rich)}</Callout>
            </div>
          </section>

          {/* ── FAQ ── */}
          <section className="space-y-6">
            <SectionH2 id="faq">{t("faq.sectionTitle")}</SectionH2>
            <HelpFaqAccordion items={faqItems} />
          </section>

        </div>
      </div>
    </div>
  );
}
