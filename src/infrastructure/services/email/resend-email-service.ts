import { Resend } from "resend";
import type {
  EmailService,
  RegistrationConfirmationEmailData,
  WaitlistPromotionEmailData,
  HostNewRegistrationEmailData,
  HostNewCommentEmailData,
  NewMomentFollowerEmailData,
  NewMomentMemberEmailData,
  HostNewFollowerEmailData,
} from "@/domain/ports/services/email-service";
import { RegistrationConfirmationEmail } from "./templates/registration-confirmation";
import { WaitlistPromotionEmail } from "./templates/waitlist-promotion";
import { HostNewRegistrationEmail } from "./templates/host-new-registration";
import { HostNewCommentEmail } from "./templates/host-new-comment";
import { NewMomentNotificationEmail } from "./templates/new-moment-notification";
import { HostNewFollowerEmail } from "./templates/host-new-follower";

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

export function createResendEmailService(): EmailService {
  const resend = new Resend(process.env.AUTH_RESEND_KEY);
  const from = getSender();
  const baseUrl = getBaseUrl();

  return {
    async sendRegistrationConfirmation(
      data: RegistrationConfirmationEmailData
    ): Promise<void> {
      await resend.emails.send({
        from,
        to: data.to,
        subject: data.strings.subject,
        react: RegistrationConfirmationEmail({ ...data, baseUrl }),
        ...(data.icsContent && {
          attachments: [
            {
              filename: "event.ics",
              content: Buffer.from(data.icsContent).toString("base64"),
              contentType: "text/calendar; method=PUBLISH",
            },
          ],
        }),
      });
    },

    async sendWaitlistPromotion(
      data: WaitlistPromotionEmailData
    ): Promise<void> {
      await resend.emails.send({
        from,
        to: data.to,
        subject: data.strings.subject,
        react: WaitlistPromotionEmail({ ...data, baseUrl }),
        ...(data.icsContent && {
          attachments: [
            {
              filename: "event.ics",
              content: Buffer.from(data.icsContent).toString("base64"),
              contentType: "text/calendar; method=PUBLISH",
            },
          ],
        }),
      });
    },

    async sendHostNewRegistration(
      data: HostNewRegistrationEmailData
    ): Promise<void> {
      await resend.emails.send({
        from,
        to: data.to,
        subject: data.strings.subject,
        react: HostNewRegistrationEmail({ ...data, baseUrl }),
      });
    },

    async sendHostNewComment(data: HostNewCommentEmailData): Promise<void> {
      await resend.emails.send({
        from,
        to: data.to,
        subject: data.strings.subject,
        react: HostNewCommentEmail({ ...data, baseUrl }),
      });
    },

    async sendNewMomentToFollower(
      data: NewMomentFollowerEmailData
    ): Promise<void> {
      await resend.emails.send({
        from,
        to: data.to,
        subject: data.strings.subject,
        react: NewMomentNotificationEmail({ ...data, baseUrl }),
      });
    },

    async sendNewMomentToMember(
      data: NewMomentMemberEmailData
    ): Promise<void> {
      await resend.emails.send({
        from,
        to: data.to,
        subject: data.strings.subject,
        react: NewMomentNotificationEmail({ ...data, baseUrl }),
      });
    },

    async sendHostNewFollower(data: HostNewFollowerEmailData): Promise<void> {
      await resend.emails.send({
        from,
        to: data.to,
        subject: data.strings.subject,
        react: HostNewFollowerEmail({ ...data, baseUrl }),
      });
    },
  };
}
