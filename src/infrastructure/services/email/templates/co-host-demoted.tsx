import { Button, Hr, Link, Section, Text } from "@react-email/components";
import * as React from "react";
import { EmailLayout } from "./components/email-layout";
import type { CoHostDemotedEmailData } from "@/domain/ports/services/email-service";
import { ctaButton, title, headingLg as heading } from "./components/email-styles";

type Props = CoHostDemotedEmailData & {
  baseUrl: string;
};

export function CoHostDemotedEmail({
  circleName,
  circleSlug,
  baseUrl,
  strings,
}: Props) {
  const circleUrl = `${baseUrl}/circles/${circleSlug}`;

  return (
    <EmailLayout preview={strings.subject} footer={strings.footer}>
      <Text style={title}>{circleName}</Text>

      <Text style={heading}>{strings.heading}</Text>
      <Text style={paragraph}>{strings.intro}</Text>

      <Section style={roleBox}>
        <Text style={roleText}>{strings.newRoleLabel}</Text>
      </Section>

      <Text style={note}>{strings.registrationsNote}</Text>

      <Section style={ctaSection}>
        <Button style={ctaButton} href={circleUrl}>
          {strings.ctaLabel}
        </Button>
      </Section>

      <Hr style={divider} />
      <Text style={preferencesNote}>
        <Link href={`${baseUrl}/profile`} style={preferencesLink}>
          {strings.preferencesLink}
        </Link>
      </Text>
    </EmailLayout>
  );
}

const paragraph: React.CSSProperties = {
  fontSize: "14px",
  color: "#52525b",
  margin: "0 0 20px 0",
  lineHeight: "22px",
};

const roleBox: React.CSSProperties = {
  backgroundColor: "#f4f4f5",
  borderRadius: "10px",
  padding: "14px 20px",
  marginBottom: "20px",
  textAlign: "center" as const,
};

const roleText: React.CSSProperties = {
  fontSize: "14px",
  color: "#18181b",
  fontWeight: 500,
  margin: 0,
};

const note: React.CSSProperties = {
  fontSize: "13px",
  color: "#71717a",
  margin: "0 0 24px 0",
  lineHeight: "20px",
};

const ctaSection: React.CSSProperties = {
  textAlign: "center" as const,
  marginBottom: "16px",
};

const divider: React.CSSProperties = {
  borderTop: "1px solid #e4e4e7",
  margin: "24px 0 16px 0",
};

const preferencesNote: React.CSSProperties = {
  fontSize: "12px",
  color: "#a1a1aa",
  textAlign: "center" as const,
  margin: 0,
};

const preferencesLink: React.CSSProperties = {
  color: "#a1a1aa",
  textDecoration: "underline",
};
