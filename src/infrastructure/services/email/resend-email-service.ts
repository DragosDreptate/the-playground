import { Resend } from "resend";
import type {
  EmailService,
  RegistrationConfirmationEmailData,
  WaitlistPromotionEmailData,
  HostNewRegistrationEmailData,
  NewCommentEmailData,
  NewMomentMemberEmailData,
  MomentUpdateEmailData,
  MomentCancelledEmailData,
  HostMomentCreatedEmailData,
  BroadcastMomentsBatchEmailData,
  AdminEntityCreatedEmailData,
  CircleInvitationEmailData,
  CircleInvitationsBatchEmailData,
  AdminNewUserEmailData,
} from "@/domain/ports/services/email-service";
import { RegistrationConfirmationEmail } from "./templates/registration-confirmation";
import { WaitlistPromotionEmail } from "./templates/waitlist-promotion";
import { HostNewRegistrationEmail } from "./templates/host-new-registration";
import { NewCommentEmail } from "./templates/new-comment";
import { NewMomentNotificationEmail } from "./templates/new-moment-notification";
import { MomentUpdateEmail } from "./templates/moment-update";
import { MomentCancelledEmail } from "./templates/moment-cancelled";
import { HostMomentCreatedEmail } from "./templates/host-moment-created";
import { BroadcastMomentEmail } from "./templates/broadcast-moment";
import { AdminEntityCreatedEmail } from "./templates/admin-entity-created";
import { CircleInvitationEmail } from "./templates/circle-invitation";
import { AdminNewUserEmail } from "./templates/admin-new-user";

function getBaseUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
}

function getSender(): string {
  return (
    process.env.EMAIL_FROM ||
    process.env.AUTH_EMAIL_FROM ||
    "onboarding@resend.dev"
  );
}

function isDemoEmail(email: string): boolean {
  return email.toLowerCase().endsWith("@demo.playground");
}

export function createResendEmailService(): EmailService {
  // Utiliser un placeholder si la clé est absente pour éviter de crasher au chargement
  // du module (notify-new-moment.ts l'appelle au top-level). Les envois échoueront
  // silencieusement en CI/dev sans clé — fire-and-forget côté serveur actions.
  const resend = new Resend(process.env.AUTH_RESEND_KEY ?? "re_not_configured");
  const from = getSender();
  const baseUrl = getBaseUrl();

  async function send(
    params: Parameters<typeof resend.emails.send>[0]
  ): Promise<void> {
    const to = Array.isArray(params.to) ? params.to : [params.to];
    if (to.every(isDemoEmail)) return;
    await resend.emails.send(params);
  }

  // Envoie un batch en respectant la limite de 100 emails par appel Resend.
  // Filtre les emails de démo et découpe en chunks si nécessaire.
  async function sendBatch(
    emails: Parameters<typeof resend.batch.send>[0]
  ): Promise<void> {
    const real = emails.filter((e) => {
      const to = Array.isArray(e.to) ? e.to[0] : e.to;
      return !isDemoEmail(to as string);
    });
    if (real.length === 0) return;
    const CHUNK_SIZE = 100;
    for (let i = 0; i < real.length; i += CHUNK_SIZE) {
      await resend.batch.send(real.slice(i, i + CHUNK_SIZE));
    }
  }

  return {
    async sendRegistrationConfirmation(
      data: RegistrationConfirmationEmailData
    ): Promise<void> {
      await send({
        from,
        to: data.to,
        subject: data.strings.subject,
        react: RegistrationConfirmationEmail({ ...data, baseUrl }),
        ...(data.icsContent && {
          attachments: [
            {
              filename: "event.ics",
              content: Buffer.from(data.icsContent).toString("base64"),
              contentType: "text/calendar; method=REQUEST",
            },
          ],
        }),
      });
    },

    async sendWaitlistPromotion(
      data: WaitlistPromotionEmailData
    ): Promise<void> {
      await send({
        from,
        to: data.to,
        subject: data.strings.subject,
        react: WaitlistPromotionEmail({ ...data, baseUrl }),
        ...(data.icsContent && {
          attachments: [
            {
              filename: "event.ics",
              content: Buffer.from(data.icsContent).toString("base64"),
              contentType: "text/calendar; method=REQUEST",
            },
          ],
        }),
      });
    },

    async sendHostNewRegistration(
      data: HostNewRegistrationEmailData
    ): Promise<void> {
      await send({
        from,
        to: data.to,
        subject: data.strings.subject,
        react: HostNewRegistrationEmail({ ...data, baseUrl }),
      });
    },

    async sendNewComment(data: NewCommentEmailData): Promise<void> {
      await send({
        from,
        to: data.to,
        subject: data.strings.subject,
        react: NewCommentEmail({ ...data, baseUrl }),
      });
    },

    async sendNewMomentToMember(
      data: NewMomentMemberEmailData
    ): Promise<void> {
      await send({
        from,
        to: data.to,
        subject: data.strings.subject,
        react: NewMomentNotificationEmail({ ...data, baseUrl }),
      });
    },

    async sendMomentUpdate(data: MomentUpdateEmailData): Promise<void> {
      await send({
        from,
        to: data.to,
        subject: data.strings.subject,
        react: MomentUpdateEmail({ ...data, baseUrl }),
        ...(data.icsContent && {
          attachments: [
            {
              filename: "event.ics",
              content: Buffer.from(data.icsContent).toString("base64"),
              contentType: "text/calendar; method=REQUEST",
            },
          ],
        }),
      });
    },

    async sendMomentCancelled(data: MomentCancelledEmailData): Promise<void> {
      await send({
        from,
        to: data.to,
        subject: data.strings.subject,
        react: MomentCancelledEmail({ ...data, baseUrl }),
      });
    },

    async sendHostMomentCreated(data: HostMomentCreatedEmailData): Promise<void> {
      await send({
        from,
        to: data.to,
        subject: data.strings.subject,
        react: HostMomentCreatedEmail({ ...data, baseUrl }),
        ...(data.icsContent && {
          attachments: [
            {
              filename: "event.ics",
              content: Buffer.from(data.icsContent).toString("base64"),
              contentType: "text/calendar; method=REQUEST",
            },
          ],
        }),
      });
    },

    async sendBroadcastMoments(data: BroadcastMomentsBatchEmailData): Promise<void> {
      const { recipients, ...emailData } = data;
      await sendBatch(
        recipients.map((to) => ({
          from,
          to,
          subject: emailData.strings.subject,
          react: BroadcastMomentEmail({ ...emailData, to }),
        }))
      );
    },

    async sendAdminEntityCreated(data: AdminEntityCreatedEmailData): Promise<void> {
      await send({
        from,
        to: data.to,
        subject: data.strings.subject,
        react: AdminEntityCreatedEmail({ ...data, baseUrl }),
      });
    },

    async sendCircleInvitation(data: CircleInvitationEmailData): Promise<void> {
      await send({
        from,
        to: data.to,
        subject: data.strings.subject,
        react: CircleInvitationEmail({ ...data, baseUrl }),
      });
    },

    async sendCircleInvitations(data: CircleInvitationsBatchEmailData): Promise<void> {
      const { recipients, ...emailData } = data;
      await sendBatch(
        recipients.map((to) => ({
          from,
          to,
          subject: emailData.strings.subject,
          react: CircleInvitationEmail({ ...emailData, to, baseUrl }),
        }))
      );
    },

    async sendAdminNewUser(data: AdminNewUserEmailData): Promise<void> {
      await send({
        from,
        to: data.to,
        subject: data.strings.subject,
        react: AdminNewUserEmail({ ...data, baseUrl }),
      });
    },
  };
}
