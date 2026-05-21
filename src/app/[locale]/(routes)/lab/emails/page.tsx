import { render } from "@react-email/components";
import { RegistrationConfirmationEmail } from "@/infrastructure/services/email/templates/registration-confirmation";
import { WaitlistPromotionEmail } from "@/infrastructure/services/email/templates/waitlist-promotion";
import { HostNewRegistrationEmail } from "@/infrastructure/services/email/templates/host-new-registration";
import { HostNewCircleMemberEmail } from "@/infrastructure/services/email/templates/host-new-circle-member";
import { HostMomentCreatedEmail } from "@/infrastructure/services/email/templates/host-moment-created";
import { NewCommentEmail } from "@/infrastructure/services/email/templates/new-comment";
import { HostNewCommentEmail } from "@/infrastructure/services/email/templates/host-new-comment";
import { HostContactMessageEmail } from "@/infrastructure/services/email/templates/host-contact-message";
import { MomentUpdateEmail } from "@/infrastructure/services/email/templates/moment-update";
import { MomentCancelledEmail } from "@/infrastructure/services/email/templates/moment-cancelled";
import { NewMomentNotificationEmail } from "@/infrastructure/services/email/templates/new-moment-notification";
import { BroadcastMomentEmail } from "@/infrastructure/services/email/templates/broadcast-moment";
import { CircleInvitationEmail } from "@/infrastructure/services/email/templates/circle-invitation";
import { AdminEntityCreatedEmail } from "@/infrastructure/services/email/templates/admin-entity-created";
import { AdminMomentUpdatedEmail } from "@/infrastructure/services/email/templates/admin-moment-updated";
import { AdminNewUserEmail } from "@/infrastructure/services/email/templates/admin-new-user";
import { MagicLinkEmail } from "@/infrastructure/services/email/templates/magic-link";
import { RegistrationReminderEmail } from "@/infrastructure/services/email/templates/registration-reminder";
import { RegistrationRemovedByHostEmail } from "@/infrastructure/services/email/templates/registration-removed-by-host";
import { MemberRemovedFromCircleEmail } from "@/infrastructure/services/email/templates/member-removed-from-circle";
import { OnboardingWelcomeEmail } from "@/infrastructure/services/email/templates/onboarding-welcome";
import { onboardingWelcomeContent } from "@/content/emails/onboarding-welcome.content";
import { EmailPreviewClient } from "./email-preview-client";

const BASE_URL = "https://the-playground.fr";
const FOOTER = "Powered by The Playground — Lancez votre communauté, gratuitement.";

async function buildTemplates(): Promise<{ id: string; label: string; subject: string; html: string }[]> {
  const templates = [
    {
      id: "registration-confirmation",
      label: "Confirmation d'inscription",
      subject: "Inscription confirmée : Soirée JS & Pizza",
      element: RegistrationConfirmationEmail({
        to: "alice@example.com",
        playerName: "Alice Martin",
        momentTitle: "Soirée JS & Pizza",
        momentSlug: "soiree-js-pizza",
        momentDate: "vendredi 21 mars 2026, 19:00",
        momentDateMonth: "MAR",
        momentDateDay: "21",
        locationText: "Le Cargo, 18 rue de la Paix, Paris",
        circleName: "Paris Creative Tech",
        circleSlug: "paris-creative-tech",
        status: "REGISTERED",
        strings: {
          subject: "Inscription confirmée : Soirée JS & Pizza",
          heading: "Inscription confirmée !",
          statusMessage: "Vous êtes inscrit(e) à Soirée JS & Pizza.",
          dateLabel: "Date",
          locationLabel: "Lieu",
          viewMomentCta: "Voir l'événement",
          cancelLink: "Annuler mon inscription",
          dashboardLink: "Retrouvez tous vos événements dans Mon espace →",
          footer: FOOTER,
        },
        baseUrl: BASE_URL,
      }),
    },
    {
      id: "waitlist",
      label: "Liste d'attente",
      subject: "Votre place est confirmée : Soirée JS & Pizza",
      element: WaitlistPromotionEmail({
        to: "alice@example.com",
        playerName: "Alice Martin",
        momentTitle: "Soirée JS & Pizza",
        momentSlug: "soiree-js-pizza",
        momentDate: "vendredi 21 mars 2026, 19:00",
        momentDateMonth: "MAR",
        momentDateDay: "21",
        locationText: "Le Cargo, 18 rue de la Paix, Paris",
        circleName: "Paris Creative Tech",
        circleSlug: "paris-creative-tech",
        strings: {
          subject: "Votre place est confirmée : Soirée JS & Pizza",
          heading: "Bonne nouvelle !",
          statusMessage: "Une place s'est libérée ! Votre inscription à Soirée JS & Pizza est confirmée.",
          dateLabel: "Date",
          locationLabel: "Lieu",
          viewMomentCta: "Voir l'événement",
          footer: FOOTER,
        },
        baseUrl: BASE_URL,
      }),
    },
    {
      id: "host-new-registration",
      label: "Host — Nouvelle inscription",
      subject: "Alice Martin s'est inscrit(e) à Soirée JS & Pizza",
      element: HostNewRegistrationEmail({
        to: "bob@example.com",
        hostName: "Bob Dupont",
        playerName: "Alice Martin",
        momentTitle: "Soirée JS & Pizza",
        momentSlug: "soiree-js-pizza",
        circleSlug: "paris-creative-tech",
        registrationInfo: "12 inscrit(s) / 30 places",
        strings: {
          subject: "Alice Martin s'est inscrit(e) à Soirée JS & Pizza",
          heading: "Nouvelle inscription",
          message: "Alice Martin s'est inscrit(e) à Soirée JS & Pizza",
          manageRegistrationsCta: "Gérer les inscriptions",
          footer: FOOTER,
        },
        baseUrl: BASE_URL,
      }),
    },
    {
      id: "host-new-circle-member",
      label: "Host — Nouveau membre Communauté",
      subject: "Alice Martin a rejoint Paris Creative Tech",
      element: HostNewCircleMemberEmail({
        to: "bob@example.com",
        hostName: "Bob Dupont",
        playerName: "Alice Martin",
        circleName: "Paris Creative Tech",
        circleSlug: "paris-creative-tech",
        memberCount: 48,
        strings: {
          subject: "Alice Martin a rejoint Paris Creative Tech",
          heading: "Nouveau membre",
          message: "Alice Martin vient de rejoindre Paris Creative Tech.",
          memberCountInfo: "48 membres au total",
          manageMembersCta: "Voir les membres",
          footer: FOOTER,
        },
        baseUrl: BASE_URL,
      }),
    },
    {
      id: "host-moment-created",
      label: "Host — Événement publié",
      subject: "Votre événement est en ligne : Soirée JS & Pizza",
      element: HostMomentCreatedEmail({
        to: "bob@example.com",
        hostName: "Bob Dupont",
        momentTitle: "Soirée JS & Pizza",
        momentSlug: "soiree-js-pizza",
        circleSlug: "paris-creative-tech",
        momentDate: "vendredi 21 mars 2026, 19:00",
        momentDateMonth: "MAR",
        momentDateDay: "21",
        locationText: "Le Cargo, 18 rue de la Paix, Paris",
        circleName: "Paris Creative Tech",
        strings: {
          subject: "Votre événement est en ligne : Soirée JS & Pizza",
          heading: "Votre événement est publié !",
          statusMessage: "Vous avez programmé Soirée JS & Pizza. Partagez le lien pour inviter vos participants.",
          dateLabel: "Date",
          locationLabel: "Lieu",
          manageMomentCta: "Gérer l'événement",
          footer: FOOTER,
        },
        baseUrl: BASE_URL,
      }),
    },
    {
      id: "new-comment",
      label: "Participant — Nouveau commentaire",
      subject: "Charlie Leroy a commenté Soirée JS & Pizza",
      element: NewCommentEmail({
        to: "alice@example.com",
        recipientName: "Alice Martin",
        playerName: "Charlie Leroy",
        momentTitle: "Soirée JS & Pizza",
        momentSlug: "soiree-js-pizza",
        commentPreview: "Super événement, j'ai hâte d'y être ! Est-ce qu'on peut venir avec un ami ?",
        strings: {
          subject: "Charlie Leroy a commenté Soirée JS & Pizza",
          heading: "Nouveau commentaire",
          message: "Charlie Leroy a commenté l'événement Soirée JS & Pizza",
          commentPreviewLabel: "Commentaire",
          viewCommentCta: "Voir le commentaire",
          footer: FOOTER,
        },
        baseUrl: BASE_URL,
      }),
    },
    {
      id: "host-new-comment",
      label: "Host — Nouveau commentaire",
      subject: "Alice Martin a commenté Soirée JS & Pizza",
      element: HostNewCommentEmail({
        to: "bob@example.com",
        recipientName: "Bob Dupont",
        playerName: "Alice Martin",
        momentTitle: "Soirée JS & Pizza",
        momentSlug: "soiree-js-pizza",
        commentPreview: "Super événement, j'ai hâte d'y être ! Est-ce qu'on peut venir avec un ami ?",
        strings: {
          subject: "Alice Martin a commenté Soirée JS & Pizza",
          heading: "Nouveau commentaire",
          message: "Alice Martin a commenté votre événement Soirée JS & Pizza",
          commentPreviewLabel: "Commentaire",
          viewCommentCta: "Voir le commentaire",
          footer: FOOTER,
        },
        baseUrl: BASE_URL,
      }),
    },
    {
      id: "host-contact-message",
      label: "Host — Message d'un Participant (Contacter l'organisateur)",
      subject: "Un membre vous contacte sur The Playground",
      element: HostContactMessageEmail({
        to: "bob@example.com",
        replyTo: "alice@example.com",
        recipientName: "Bob Dupont",
        message:
          "Bonjour Bob,\n\nUne question rapide sur l'événement : est-ce que les places sont en accès libre une fois sur place, ou y a-t-il un check-in à l'entrée ? Je risque d'arriver un peu en retard.\n\nMerci pour l'organisation, je suis vraiment ravie de pouvoir y assister !\n\nAlice",
        aboutLine: "À propos de l'événement « Soirée JS & Pizza » · Paris Creative Tech",
        appUrl: BASE_URL,
        strings: {
          subject: "Un membre vous contacte sur The Playground",
          heading: "Vous avez un nouveau message",
          intro: "Alice Martin vous a envoyé un message via The Playground.",
          messageLabel: "Message",
          replyHint:
            "Pour répondre à Alice Martin, répondez simplement à cet email — ou écrivez à alice@example.com.",
          footer: FOOTER,
        },
      }),
    },
    {
      id: "moment-update",
      label: "Mise à jour d'événement",
      subject: "Mise à jour : Soirée JS & Pizza",
      element: MomentUpdateEmail({
        to: "alice@example.com",
        playerName: "Alice Martin",
        momentTitle: "Soirée JS & Pizza",
        momentSlug: "soiree-js-pizza",
        momentDate: "samedi 22 mars 2026, 19:00",
        momentDateMonth: "MAR",
        momentDateDay: "22",
        locationText: "Station F, 5 parvis Alan Turing, Paris",
        circleName: "Paris Creative Tech",
        circleSlug: "paris-creative-tech",
        dateChanged: true,
        locationChanged: true,
        strings: {
          subject: "Mise à jour : Soirée JS & Pizza",
          heading: "Un événement a été modifié",
          intro: "L'organisateur a apporté des modifications à un événement auquel vous êtes inscrit(e).",
          dateChangedLabel: "Nouvelle date",
          locationChangedLabel: "Nouveau lieu",
          dateLabel: "Date",
          locationLabel: "Lieu",
          viewMomentCta: "Voir l'événement",
          footer: FOOTER,
        },
        baseUrl: BASE_URL,
      }),
    },
    {
      id: "moment-cancelled",
      label: "Événement annulé",
      subject: "Annulé : Soirée JS & Pizza",
      element: MomentCancelledEmail({
        to: "alice@example.com",
        recipientName: "Alice Martin",
        momentTitle: "Soirée JS & Pizza",
        momentDate: "vendredi 21 mars 2026, 19:00",
        momentDateMonth: "MAR",
        momentDateDay: "21",
        locationText: "Le Cargo, 18 rue de la Paix, Paris",
        circleName: "Paris Creative Tech",
        circleSlug: "paris-creative-tech",
        strings: {
          subject: "Annulé : Soirée JS & Pizza",
          heading: "Cet événement a été annulé",
          message: "L'organisateur a annulé Soirée JS & Pizza. Nous espérons vous retrouver lors d'un prochain événement.",
          ctaLabel: "Voir la Communauté",
          footer: FOOTER,
        },
        baseUrl: BASE_URL,
      }),
    },
    {
      id: "new-moment-notification",
      label: "Nouvel événement (membres)",
      subject: "🎉 Nouvel événement — Paris Creative Tech",
      element: NewMomentNotificationEmail({
        to: "alice@example.com",
        recipientName: "Alice",
        circleName: "Paris Creative Tech",
        circleSlug: "paris-creative-tech",
        momentTitle: "Soirée JS & Pizza",
        momentSlug: "soiree-js-pizza",
        momentDate: "vendredi 21 mars 2026, 19:00",
        momentDateMonth: "MAR",
        momentDateDay: "21",
        momentLocation: "Le Cargo, 18 rue de la Paix, Paris",
        strings: {
          subject: "🎉 Nouvel événement — Paris Creative Tech",
          preheader: "Un nouvel événement vient d'être publié dans votre Communauté",
          heading: "Nouvel événement dans Paris Creative Tech",
          intro: "Un nouvel événement vient d'être publié dans votre Communauté :",
          dateLabel: "Date",
          locationLabel: "Lieu",
          ctaLabel: "S'inscrire",
          unsubscribeText: "Vous recevez cet email car vous êtes membre de Paris Creative Tech sur The Playground.",
          unsubscribeLabel: "Voir la Communauté",
        },
        baseUrl: BASE_URL,
      }),
    },
    {
      id: "broadcast-moment",
      label: "Diffusion événement (broadcast)",
      subject: "Nouveau : Soirée JS & Pizza",
      element: BroadcastMomentEmail({
        to: "alice@example.com",
        momentTitle: "Soirée JS & Pizza",
        momentDate: "vendredi 21 mars 2026, 19:00",
        momentDateMonth: "MAR",
        momentDateDay: "21",
        momentLocation: "Le Cargo, 18 rue de la Paix, Paris",
        circleName: "Paris Creative Tech",
        momentSlug: "soiree-js-pizza",
        appUrl: BASE_URL,
        strings: {
          subject: "Nouveau : Soirée JS & Pizza",
          preheader: "Paris Creative Tech vous invite à un événement",
          heading: "Paris Creative Tech vous invite",
          intro: "Bob Dupont partage un événement avec vous",
          customMessage: "Cet événement est spécial — venez nombreux, on a prévu des surprises 🎉",
          dateLabel: "Date",
          locationLabel: "Lieu",
          ctaLabel: "Voir l'événement",
          unsubscribeText: "Vous recevez cet email car vous êtes membre de Paris Creative Tech.",
          unsubscribeLabel: "Gérer mes notifications",
        },
      }),
    },
    {
      id: "circle-invitation",
      label: "Invitation Communauté",
      subject: "Bob Dupont vous invite à rejoindre Paris Creative Tech",
      element: CircleInvitationEmail({
        to: "alice@example.com",
        inviterName: "Bob Dupont",
        circleName: "Paris Creative Tech",
        circleDescription: "Une communauté pour les développeurs, designers et product managers parisiens passionnés par les nouvelles technologies. On se retrouve chaque mois pour des talks, workshops et soirées networking.\n\nRejoignez-nous pour partager vos projets et découvrir ceux des autres !",
        circleSlug: "paris-creative-tech",
        coverImageUrl: null,
        memberCount: 47,
        momentCount: 3,
        circleUrl: `${BASE_URL}/circles/paris-creative-tech`,
        strings: {
          subject: "Bob Dupont vous invite à rejoindre Paris Creative Tech",
          ctaLabel: "Rejoindre la Communauté",
          footer: "Invitation envoyée par Bob Dupont via The Playground — the-playground.fr",
        },
      }),
    },
    {
      id: "admin-entity-created",
      label: "Admin — Nouvelle entité (Communauté)",
      subject: "[Admin] Nouvelle Communauté créée — Paris Creative Tech",
      element: AdminEntityCreatedEmail({
        to: "admin@the-playground.fr",
        entityType: "circle",
        entityName: "Paris Creative Tech",
        creatorName: "Bob Dupont",
        creatorEmail: "bob@example.com",
        entityUrl: `${BASE_URL}/admin/circles/paris-creative-tech`,
        strings: {
          subject: "[Admin] Nouvelle Communauté créée — Paris Creative Tech",
          heading: "Nouvelle Communauté sur The Playground",
          message: "Bob Dupont vient de créer une nouvelle Communauté.",
          ctaLabel: "Voir la Communauté dans l'admin",
          footer: "Vous recevez cet email car vous êtes administrateur de The Playground.",
        },
        baseUrl: BASE_URL,
      }),
    },
    {
      id: "admin-entity-created-moment",
      label: "Admin — Nouvel événement",
      subject: "[Admin] Nouvel événement créé — Soirée JS & Pizza",
      element: AdminEntityCreatedEmail({
        to: "admin@the-playground.fr",
        entityType: "moment",
        entityName: "Soirée JS & Pizza",
        creatorName: "Bob Dupont",
        creatorEmail: "bob@example.com",
        circleName: "Paris Creative Tech",
        momentDate: "vendredi 21 mars 2026, 19:00",
        locationText: "Le Cargo, 18 rue de la Paix, Paris",
        entityUrl: `${BASE_URL}/dashboard/circles/paris-creative-tech/moments/soiree-js-pizza`,
        strings: {
          subject: "[Admin] Nouvel événement créé — Soirée JS & Pizza",
          heading: "Nouvel événement sur The Playground",
          message: "Bob Dupont vient de créer un nouvel événement.",
          ctaLabel: "Voir l'événement dans l'admin",
          footer: "Vous recevez cet email car vous êtes administrateur de The Playground.",
          dateLabel: "Date",
          locationLabel: "Lieu",
        },
        baseUrl: BASE_URL,
      }),
    },
    {
      id: "admin-moment-updated",
      label: "Admin — Événement modifié",
      subject: "[Admin] Événement modifié — Soirée JS & Pizza",
      element: AdminMomentUpdatedEmail({
        to: "admin@the-playground.fr",
        momentTitle: "Soirée JS & Pizza",
        circleName: "Paris Creative Tech",
        hostName: "Bob Dupont",
        hostEmail: "bob@example.com",
        momentUrl: `${BASE_URL}/dashboard/circles/paris-creative-tech/moments/soiree-js-pizza`,
        momentDate: "vendredi 21 mars 2026, 19:00",
        locationText: "Le Cargo, 18 rue de la Paix, Paris",
        changedFields: ["Date", "Lieu", "Capacité"],
        strings: {
          subject: "[Admin] Événement modifié — Soirée JS & Pizza",
          heading: "Événement modifié",
          message: "Bob Dupont vient de modifier un événement publié.",
          changesLabel: "Champs modifiés",
          dateLabel: "Date",
          locationLabel: "Lieu",
          ctaLabel: "Voir dans l'admin",
          footer: FOOTER,
        },
        baseUrl: BASE_URL,
      }),
    },
    {
      id: "admin-new-user",
      label: "Admin — Nouvel utilisateur",
      subject: "Nouvel utilisateur : Alice Martin",
      element: AdminNewUserEmail({
        to: "admin@the-playground.fr",
        userName: "Alice Martin",
        userEmail: "alice@example.com",
        registeredAt: "samedi 15 mars 2026",
        adminUsersUrl: `${BASE_URL}/admin/users`,
        strings: {
          subject: "Nouvel utilisateur : Alice Martin",
          heading: "Nouvel utilisateur",
          message: "Alice Martin vient de compléter son profil sur The Playground.",
          ctaLabel: "Voir les utilisateurs",
          footer: FOOTER,
        },
        baseUrl: BASE_URL,
      }),
    },
    {
      id: "magic-link",
      label: "Magic Link (connexion)",
      subject: "Votre lien de connexion — The Playground",
      element: MagicLinkEmail({
        url: `${BASE_URL}/auth/verify?token=abc123`,
        baseUrl: BASE_URL,
        strings: {
          preview: "Votre lien de connexion à The Playground",
          heading: "Votre lien de connexion",
          bodyText:
            "Cliquez sur le bouton ci-dessous pour vous connecter. Ce lien est valable 15 minutes et ne peut être utilisé qu'une seule fois.",
          ctaLabel: "Se connecter →",
          expiryText: "Expire dans 15 minutes · Usage unique",
          securityText:
            "Vous n'avez pas demandé ce lien ? Votre compte reste sécurisé, ignorez simplement cet email.",
          footer:
            "The Playground · Si vous n'avez pas demandé ce lien, ignorez cet email en toute sécurité.",
        },
      }),
    },
    {
      id: "registration-removed-by-host",
      label: "Inscription invalidée par l'Organisateur",
      subject: "Inscription invalidée : Soirée JS & Pizza",
      element: RegistrationRemovedByHostEmail({
        to: "alice@example.com",
        playerName: "Alice Martin",
        momentTitle: "Soirée JS & Pizza",
        momentSlug: "soiree-js-pizza",
        momentDate: "vendredi 21 mars 2026, 19:00",
        momentDateMonth: "MAR",
        momentDateDay: "21",
        locationText: "Le Cargo, 18 rue de la Paix, Paris",
        circleName: "Paris Creative Tech",
        circleSlug: "paris-creative-tech",
        strings: {
          subject: "Inscription invalidée : Soirée JS & Pizza",
          heading: "Votre inscription a été invalidée",
          message: "L'organisateur de Paris Creative Tech a invalidé votre inscription à Soirée JS & Pizza.",
          ctaLabel: "Voir la Communauté",
          footer: FOOTER,
        },
        baseUrl: BASE_URL,
      }),
    },
    {
      id: "member-removed-from-circle",
      label: "Membre retiré de la Communauté",
      subject: "Votre inscription à Paris Creative Tech a été invalidée",
      element: MemberRemovedFromCircleEmail({
        to: "alice@example.com",
        memberName: "Alice Martin",
        circleName: "Paris Creative Tech",
        cancelledRegistrations: 2,
        strings: {
          subject: "Votre inscription à Paris Creative Tech a été invalidée",
          heading: "Votre inscription a été invalidée",
          message: "L'organisateur de Paris Creative Tech a invalidé votre inscription à cette Communauté.",
          cancelledRegistrationsMessage: "Vos 2 inscription(s) à venir dans cette Communauté ont également été annulées.",
          ctaLabel: "Découvrir d'autres Communautés",
          footer: FOOTER,
        },
        baseUrl: BASE_URL,
      }),
    },
    {
      id: "onboarding-welcome",
      label: "Onboarding — Lettre du fondateur",
      subject: onboardingWelcomeContent.subject,
      element: OnboardingWelcomeEmail({
        firstName: "Alice",
        // Utilise l'URL de l'app pour que la preview charge le logo local en dev
        baseUrl: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
      }),
    },
    {
      id: "registration-reminder",
      label: "Rappel 24h avant événement",
      subject: "Rappel : Soirée JS & Pizza — demain",
      element: RegistrationReminderEmail({
        to: "alice@example.com",
        playerName: "Alice Martin",
        momentTitle: "Soirée JS & Pizza",
        momentSlug: "soiree-js-pizza",
        momentDate: "vendredi 21 mars 2026, 19:00",
        momentDateMonth: "MAR",
        momentDateDay: "21",
        locationText: "Le Cargo, 18 rue de la Paix, Paris",
        circleName: "Paris Creative Tech",
        circleSlug: "paris-creative-tech",
        strings: {
          subject: "Rappel : Soirée JS & Pizza — demain",
          heading: "C'est demain ! Voici un rappel pour votre événement.",
          dateLabel: "Date",
          locationLabel: "Lieu",
          viewMomentCta: "Voir l'événement",
          footer: FOOTER,
        },
        baseUrl: BASE_URL,
      }),
    },
  ];

  const rendered = await Promise.all(
    templates.map(async ({ id, label, subject, element }) => ({
      id,
      label,
      subject,
      html: await render(element),
    }))
  );

  return rendered;
}

export default async function EmailPreviewPage() {
  const templates = await buildTemplates();
  return <EmailPreviewClient templates={templates} />;
}
