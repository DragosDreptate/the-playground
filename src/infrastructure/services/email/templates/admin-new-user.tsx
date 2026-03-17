import { Button, Section, Text } from "@react-email/components";
import * as React from "react";
import { EmailLayout } from "./components/email-layout";
import type { AdminNewUserEmailData } from "@/domain/ports/services/email-service";
import {
  ctaButton,
  headingLg as heading,
  infoCard,
  infoLabel,
  infoValue,
} from "./components/email-styles";

type Props = AdminNewUserEmailData & {
  baseUrl: string;
};

export function AdminNewUserEmail({
  userName,
  userEmail,
  registeredAt,
  adminUsersUrl,
  strings,
}: Props) {
  return (
    <EmailLayout preview={strings.subject} footer={strings.footer}>
      <Text style={heading}>{strings.heading}</Text>

      <Text style={message}>{strings.message}</Text>

      <Section style={infoCard}>
        <Text style={infoLabel}>Nom</Text>
        <Text style={infoValue}>{userName}</Text>
        <Text style={infoLabel}>Email</Text>
        <Text style={infoValue}>{userEmail}</Text>
        <Text style={infoLabel}>Inscrit le</Text>
        <Text style={infoValue}>{registeredAt}</Text>
      </Section>

      <Section style={ctaSection}>
        <Button style={ctaButton} href={adminUsersUrl}>
          {strings.ctaLabel}
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

