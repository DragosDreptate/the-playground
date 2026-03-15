import { render } from "@react-email/components";
import { RegistrationConfirmationEmail } from "@/infrastructure/services/email/templates/registration-confirmation";
import { WaitlistPromotionEmail } from "@/infrastructure/services/email/templates/waitlist-promotion";
import { HostNewRegistrationEmail } from "@/infrastructure/services/email/templates/host-new-registration";
import { HostMomentCreatedEmail } from "@/infrastructure/services/email/templates/host-moment-created";
import { NewCommentEmail } from "@/infrastructure/services/email/templates/new-comment";
import { HostNewCommentEmail } from "@/infrastructure/services/email/templates/host-new-comment";
import { MomentUpdateEmail } from "@/infrastructure/services/email/templates/moment-update";
import { MomentCancelledEmail } from "@/infrastructure/services/email/templates/moment-cancelled";
import { NewMomentNotificationEmail } from "@/infrastructure/services/email/templates/new-moment-notification";
import { BroadcastMomentEmail } from "@/infrastructure/services/email/templates/broadcast-moment";
import { CircleInvitationEmail } from "@/infrastructure/services/email/templates/circle-invitation";
import { AdminEntityCreatedEmail } from "@/infrastructure/services/email/templates/admin-entity-created";
import { AdminNewUserEmail } from "@/infrastructure/services/email/templates/admin-new-user";
import { MagicLinkEmail } from "@/infrastructure/services/email/templates/magic-link";
import { EmailPreviewClient } from "./email-preview-client";

const BASE_URL = "https://the-playground.fr";
const FOOTER = "Powered by The Playground — Lancez votre communauté, gratuitement.";

async function buildTemplates(): Promise<{ id: string; label: string; html: string }[]> {
  const templates = [
    {
      id: "registration-confirmation",
      label: "Confirmation d'inscription",
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
      id: "host-moment-created",
      label: "Host — Événement publié",
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
      id: "moment-update",
      label: "Mise à jour d'événement",
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
      element: NewMomentNotificationEmail({
        to: "alice@example.com",
        recipientName: "Alice",
        circleName: "Paris Creative Tech",
        circleSlug: "paris-creative-tech",
        momentTitle: "Soirée JS & Pizza",
        momentSlug: "soiree-js-pizza",
        momentDate: "vendredi 21 mars 2026, 19:00",
        momentLocation: "Le Cargo, 18 rue de la Paix, Paris",
        strings: {
          subject: "🎉 Nouvel événement — Paris Creative Tech",
          preheader: "Un nouvel événement vient d'être publié dans votre Communauté",
          heading: "Nouvel événement dans Paris Creative Tech",
          intro: "Un nouvel événement vient d'être publié dans votre Communauté :",
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
      element: BroadcastMomentEmail({
        to: "alice@example.com",
        momentTitle: "Soirée JS & Pizza",
        momentDate: "vendredi 21 mars 2026, 19:00",
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
          ctaLabel: "Voir l'événement",
          unsubscribeText: "Vous recevez cet email car vous êtes membre de Paris Creative Tech.",
          unsubscribeLabel: "Gérer mes notifications",
        },
      }),
    },
    {
      id: "circle-invitation",
      label: "Invitation Communauté",
      element: CircleInvitationEmail({
        to: "alice@example.com",
        inviterName: "Bob Dupont",
        circleName: "Paris Creative Tech",
        circleDescription: "Une communauté pour les développeurs, designers et product managers parisiens passionnés par les nouvelles technologies. On se retrouve chaque mois pour des talks, workshops et soirées networking.\n\nRejoignez-nous pour partager vos projets et découvrir ceux des autres !",
        circleSlug: "paris-creative-tech",
        coverImageUrl: null,
        memberCount: 47,
        momentCount: 3,
        inviteUrl: `${BASE_URL}/circles/join/abc123`,
        strings: {
          subject: "Bob Dupont vous invite à rejoindre Paris Creative Tech",
          ctaLabel: "Rejoindre la Communauté",
          footer: "Invitation envoyée par Bob Dupont via The Playground — the-playground.fr",
        },
        baseUrl: BASE_URL,
      }),
    },
    {
      id: "admin-entity-created",
      label: "Admin — Nouvelle entité",
      element: AdminEntityCreatedEmail({
        to: "admin@the-playground.fr",
        entityType: "circle",
        entityName: "Paris Creative Tech",
        creatorName: "Bob Dupont",
        creatorEmail: "bob@example.com",
        entityUrl: `${BASE_URL}/admin/circles/paris-creative-tech`,
        strings: {
          subject: "Nouvelle Communauté créée : Paris Creative Tech",
          heading: "Nouvelle Communauté",
          message: "Bob Dupont vient de créer la Communauté Paris Creative Tech.",
          ctaLabel: "Voir dans l'admin",
          footer: FOOTER,
        },
        baseUrl: BASE_URL,
      }),
    },
    {
      id: "admin-new-user",
      label: "Admin — Nouvel utilisateur",
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
      element: MagicLinkEmail({
        url: `${BASE_URL}/auth/verify?token=abc123`,
      }),
    },
  ];

  const rendered = await Promise.all(
    templates.map(async ({ id, label, element }) => ({
      id,
      label,
      html: await render(element),
    }))
  );

  return rendered;
}

export default async function EmailPreviewPage() {
  const templates = await buildTemplates();
  return <EmailPreviewClient templates={templates} />;
}
