import { Button, Section, Text } from "@react-email/components";
import * as React from "react";
import { EmailLayout } from "./components/email-layout";
import { CalendarBadge } from "./components/calendar-badge";
import type { HostMomentCreatedEmailData } from "@/domain/ports/services/email-service";

type Props = HostMomentCreatedEmailData & {
  baseUrl: string;
};

export function HostMomentCreatedEmail({
  hostName,
  momentTitle,
  momentSlug,
  circleSlug,
  momentDate,
  momentDateMonth,
  momentDateDay,
  locationText,
  baseUrl,
  strings,
}: Props) {
  const manageMomentUrl = `${baseUrl}/dashboard/circles/${circleSlug}/moments/${momentSlug}`;

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

      <Section style={ctaSection}>
        <Button style={ctaButton} href={manageMomentUrl}>
          {strings.manageMomentCta}
        </Button>
      </Section>
    </EmailLayout>
  );
}

const title: React.CSSProperties = {
  fontSize: "20px",
  fontWeight: 700,
  color: "#18181b",
  textAlign: "center" as const,
  margin: "0 0 24px 0",
  lineHeight: "28px",
};

const heading: React.CSSProperties = {
  fontSize: "16px",
  fontWeight: 600,
  color: "#18181b",
  margin: "0 0 8px 0",
  lineHeight: "24px",
};

const statusMessage: React.CSSProperties = {
  fontSize: "14px",
  color: "#52525b",
  margin: "0 0 24px 0",
  lineHeight: "22px",
};

const metaSection: React.CSSProperties = {
  borderTop: "1px solid #e4e4e7",
  paddingTop: "16px",
  marginBottom: "24px",
};

const metaRow: React.CSSProperties = {
  fontSize: "14px",
  color: "#18181b",
  margin: "0 0 12px 0",
  lineHeight: "20px",
};

const metaLabel: React.CSSProperties = {
  color: "#71717a",
  fontSize: "12px",
  fontWeight: 500,
  textTransform: "uppercase" as const,
  letterSpacing: "0.5px",
};

const metaValue: React.CSSProperties = {
  color: "#18181b",
  fontSize: "14px",
  fontWeight: 500,
};

const ctaSection: React.CSSProperties = {
  textAlign: "center" as const,
  marginBottom: "16px",
};

const ctaButton: React.CSSProperties = {
  background: "linear-gradient(135deg, #ec4899, #8b5cf6)",
  color: "#ffffff",
  fontSize: "14px",
  fontWeight: 600,
  borderRadius: "8px",
  padding: "12px 32px",
  textDecoration: "none",
  display: "inline-block",
};
