import { Button, Section, Text } from "@react-email/components";
import * as React from "react";
import { EmailLayout } from "./components/email-layout";
import type { HostNewCircleMemberEmailData } from "@/domain/ports/services/email-service";
import {
  ctaButton,
  headingLg as heading,
  statsSection,
  statsText,
} from "./components/email-styles";

type Props = HostNewCircleMemberEmailData & {
  baseUrl: string;
};

export function HostNewCircleMemberEmail({
  circleSlug,
  memberCount,
  baseUrl,
  strings,
}: Props) {
  const manageUrl = `${baseUrl}/dashboard/circles/${circleSlug}#members-section`;

  return (
    <EmailLayout preview={strings.subject} footer={strings.footer}>
      <Text style={heading}>{strings.heading}</Text>

      <Text style={message}>{strings.message}</Text>

      <Section style={statsSection}>
        <Text style={statsText}>{strings.memberCountInfo.replace("{count}", String(memberCount))}</Text>
      </Section>

      <Section style={ctaSection}>
        <Button style={ctaButton} href={manageUrl}>
          {strings.manageMembersCta}
        </Button>
      </Section>
    </EmailLayout>
  );
}

const message: React.CSSProperties = {
  fontSize: "14px",
  color: "#52525b",
  margin: "0 0 20px 0",
  lineHeight: "22px",
};

const ctaSection: React.CSSProperties = {
  textAlign: "center" as const,
};

