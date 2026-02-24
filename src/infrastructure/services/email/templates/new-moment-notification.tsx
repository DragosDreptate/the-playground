import { Button, Link, Section, Text } from "@react-email/components";
import * as React from "react";
import { EmailLayout } from "./components/email-layout";
import type { NewMomentFollowerEmailData } from "@/domain/ports/services/email-service";

type Props = NewMomentFollowerEmailData & {
  baseUrl: string;
};

export function NewMomentNotificationEmail({
  circleName,
  circleSlug,
  momentTitle,
  momentSlug,
  momentDate,
  momentLocation,
  baseUrl,
  strings,
}: Props) {
  const momentUrl = `${baseUrl}/m/${momentSlug}`;
  const circleUrl = `${baseUrl}/circles/${circleSlug}`;

  return (
    <EmailLayout preview={strings.preheader} footer={strings.unsubscribeText}>
      <Text style={heading}>{strings.heading}</Text>

      <Text style={intro}>{strings.intro}</Text>

      <Section style={eventCard}>
        <Text style={eventTitle}>{momentTitle}</Text>
        <Text style={eventMeta}>{momentDate}</Text>
        {momentLocation && (
          <Text style={eventMeta}>{momentLocation}</Text>
        )}
        <Text style={communityLabel}>{circleName}</Text>
      </Section>

      <Section style={ctaSection}>
        <Button style={ctaButton} href={momentUrl}>
          {strings.ctaLabel}
        </Button>
      </Section>

      <Text style={unsubscribeRow}>
        <Link href={circleUrl} style={unsubscribeLink}>
          {strings.unsubscribeLabel}
        </Link>
      </Text>
    </EmailLayout>
  );
}

const heading: React.CSSProperties = {
  fontSize: "16px",
  fontWeight: 600,
  color: "#18181b",
  margin: "0 0 12px 0",
  lineHeight: "24px",
};

const intro: React.CSSProperties = {
  fontSize: "14px",
  color: "#52525b",
  margin: "0 0 20px 0",
  lineHeight: "22px",
};

const eventCard: React.CSSProperties = {
  backgroundColor: "#f4f4f5",
  borderRadius: "8px",
  padding: "16px",
  marginBottom: "24px",
};

const eventTitle: React.CSSProperties = {
  fontSize: "15px",
  fontWeight: 600,
  color: "#18181b",
  margin: "0 0 6px 0",
  lineHeight: "22px",
};

const eventMeta: React.CSSProperties = {
  fontSize: "13px",
  color: "#71717a",
  margin: "0 0 4px 0",
  lineHeight: "20px",
};

const communityLabel: React.CSSProperties = {
  fontSize: "12px",
  color: "#a855f7",
  fontWeight: 500,
  margin: "8px 0 0 0",
  lineHeight: "18px",
};

const ctaSection: React.CSSProperties = {
  textAlign: "center" as const,
  marginBottom: "20px",
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

const unsubscribeRow: React.CSSProperties = {
  textAlign: "center" as const,
  fontSize: "12px",
  color: "#a1a1aa",
  margin: "0",
};

const unsubscribeLink: React.CSSProperties = {
  color: "#a1a1aa",
  textDecoration: "underline",
};
