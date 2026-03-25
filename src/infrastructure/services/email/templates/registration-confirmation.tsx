import { Button, Link, Section, Text } from "@react-email/components";
import * as React from "react";
import { EmailLayout } from "./components/email-layout";
import { CalendarBadge } from "./components/calendar-badge";
import type { RegistrationConfirmationEmailData } from "@/domain/ports/services/email-service";
import {
  ctaButton,
  title,
  headingSm as heading,
  metaSection,
  metaRow,
  metaLabel,
  metaValue,
} from "./components/email-styles";

type Props = RegistrationConfirmationEmailData & {
  baseUrl: string;
};

export function RegistrationConfirmationEmail({
  playerName,
  momentTitle,
  momentSlug,
  momentDate,
  momentDateMonth,
  momentDateDay,
  locationText,
  amountPaid,
  receiptUrl,
  baseUrl,
  strings,
}: Props) {
  const momentUrl = `${baseUrl}/m/${momentSlug}`;
  const dashboardUrl = `${baseUrl}/dashboard`;

  return (
    <EmailLayout preview={strings.subject} footer={strings.footer}>
      <CalendarBadge month={momentDateMonth} day={momentDateDay} />

      <Text style={title}>{momentTitle}</Text>

      <Text style={heading}>{strings.heading}</Text>
      <Text style={statusMessage}>{strings.statusMessage}</Text>

      <Section style={metaSection}>
        <Text style={metaRow}>
          <span style={metaLabel}>{strings.dateLabel}</span>
          <br />
          <span style={metaValue}>{momentDate}</span>
        </Text>
        <Text style={metaRow}>
          <span style={metaLabel}>{strings.locationLabel}</span>
          <br />
          <span style={metaValue}>{locationText}</span>
        </Text>
      </Section>

      {amountPaid && (
        <Section style={paymentSection}>
          <Text style={paymentText}>
            {strings.paymentConfirmed ?? "Paiement confirmé"} — {amountPaid}
            {receiptUrl && strings.viewReceipt && (
              <>
                {" · "}
                <Link href={receiptUrl} style={receiptLink}>
                  {strings.viewReceipt}
                </Link>
              </>
            )}
          </Text>
        </Section>
      )}

      <Section style={ctaSection}>
        <Button style={ctaButton} href={momentUrl}>
          {strings.viewMomentCta}
        </Button>
      </Section>

      <Text style={cancelLinkStyle}>
        <Link href={momentUrl} style={cancelLinkAnchor}>
          {strings.cancelLink}
        </Link>
      </Text>

      <Text style={dashboardLinkStyle}>
        <Link href={dashboardUrl} style={dashboardLinkAnchor}>
          {strings.dashboardLink}
        </Link>
      </Text>
    </EmailLayout>
  );
}

const statusMessage: React.CSSProperties = {
  fontSize: "14px",
  color: "#52525b",
  margin: "0 0 24px 0",
  lineHeight: "22px",
};

const ctaSection: React.CSSProperties = {
  textAlign: "center" as const,
  marginBottom: "16px",
};

const cancelLinkStyle: React.CSSProperties = {
  textAlign: "center" as const,
  margin: "0 0 12px 0",
};

const cancelLinkAnchor: React.CSSProperties = {
  color: "#a1a1aa",
  fontSize: "12px",
  textDecoration: "underline",
};

const dashboardLinkStyle: React.CSSProperties = {
  textAlign: "center" as const,
  margin: "0",
};

const dashboardLinkAnchor: React.CSSProperties = {
  color: "#71717a",
  fontSize: "12px",
  textDecoration: "none",
};

const paymentSection: React.CSSProperties = {
  backgroundColor: "#f0fdf4",
  borderRadius: "8px",
  padding: "12px 16px",
  marginBottom: "24px",
};

const paymentText: React.CSSProperties = {
  fontSize: "13px",
  color: "#166534",
  margin: "0",
  lineHeight: "20px",
};

const receiptLink: React.CSSProperties = {
  color: "#166534",
  textDecoration: "underline",
};
