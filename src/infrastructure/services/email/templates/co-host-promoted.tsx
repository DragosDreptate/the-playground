import { Button, Hr, Link, Section, Text } from "@react-email/components";
import * as React from "react";
import { EmailLayout } from "./components/email-layout";
import type { CoHostPromotedEmailData } from "@/domain/ports/services/email-service";
import { ctaButton, title, headingLg as heading } from "./components/email-styles";

type Props = CoHostPromotedEmailData & {
  baseUrl: string;
};

export function CoHostPromotedEmail({
  circleName,
  circleSlug,
  baseUrl,
  strings,
}: Props) {
  const dashboardUrl = `${baseUrl}/dashboard/circles/${circleSlug}`;

  return (
    <EmailLayout preview={strings.subject} footer={strings.footer}>
      <Text style={title}>{circleName}</Text>

      <Text style={heading}>{strings.heading}</Text>
      <Text style={paragraph}>{strings.intro}</Text>

      <Section style={rightsBox}>
        <Text style={rightsTitle}>{strings.rightsTitle}</Text>
        <Text style={rightsItem}>· {strings.rightCreateEvents}</Text>
        <Text style={rightsItem}>· {strings.rightManageRegistrations}</Text>
        <Text style={rightsItem}>· {strings.rightUpdateCircle}</Text>
        <Text style={rightsItem}>· {strings.rightBroadcast}</Text>
        <Text style={rightsItem}>· {strings.rightReceiveNotifications}</Text>
      </Section>

      <Text style={limitsNote}>{strings.limitsNote}</Text>

      <Section style={ctaSection}>
        <Button style={ctaButton} href={dashboardUrl}>
          {strings.ctaLabel}
        </Button>
      </Section>

      <Hr style={divider} />
      <Text style={leaveNote}>
        <Link href={`${baseUrl}/circles/${circleSlug}`} style={leaveLink}>
          {strings.leaveLink}
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

const rightsBox: React.CSSProperties = {
  backgroundColor: "#f0fdfa",
  border: "1px solid #99f6e4",
  borderRadius: "10px",
  padding: "16px 20px",
  marginBottom: "20px",
};

const rightsTitle: React.CSSProperties = {
  fontSize: "12px",
  fontWeight: 700,
  letterSpacing: "0.06em",
  textTransform: "uppercase" as const,
  color: "#0d9488",
  margin: "0 0 10px 0",
};

const rightsItem: React.CSSProperties = {
  fontSize: "14px",
  color: "#18181b",
  margin: "4px 0",
  lineHeight: "20px",
};

const limitsNote: React.CSSProperties = {
  fontSize: "13px",
  color: "#71717a",
  margin: "0 0 24px 0",
  lineHeight: "20px",
  fontStyle: "italic",
};

const ctaSection: React.CSSProperties = {
  textAlign: "center" as const,
  marginBottom: "16px",
};

const divider: React.CSSProperties = {
  borderTop: "1px solid #e4e4e7",
  margin: "24px 0 16px 0",
};

const leaveNote: React.CSSProperties = {
  fontSize: "12px",
  color: "#a1a1aa",
  textAlign: "center" as const,
  margin: 0,
};

const leaveLink: React.CSSProperties = {
  color: "#a1a1aa",
  textDecoration: "underline",
};
