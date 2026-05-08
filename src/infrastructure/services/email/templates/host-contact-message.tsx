import { Img, Section, Text } from "@react-email/components";
import * as React from "react";
import { EmailLayout } from "./components/email-layout";
import type { HostContactMessageEmailData } from "@/domain/ports/services/email-service";
import {
  headingLg as heading,
  commentSection,
  commentLabel,
  commentText,
} from "./components/email-styles";

type Props = HostContactMessageEmailData;

export function HostContactMessageEmail({
  senderName,
  senderEmail,
  message,
  context,
  baseUrl,
  strings,
}: Props) {
  return (
    <EmailLayout preview={strings.subject} footer={strings.footer}>
      <Section style={logoSection}>
        {/* Centrage robuste pour Outlook Word renderer : table align="center". */}
        <table
          align="center"
          role="presentation"
          cellPadding="0"
          cellSpacing="0"
          border={0}
          style={{ margin: "0 auto", borderCollapse: "collapse" }}
        >
          <tbody>
            <tr>
              <td>
                <Img
                  src={`${baseUrl}/brand/logo-light.png`}
                  width="180"
                  height="32"
                  alt="The Playground"
                  style={logoImg}
                />
              </td>
            </tr>
          </tbody>
        </table>
      </Section>

      <Text style={heading}>{strings.heading}</Text>

      <Text style={contextLabel}>{context}</Text>

      <Text style={intro}>
        {strings.intro.replace("{senderName}", senderName)}
      </Text>

      <Section style={commentSection}>
        <Text style={commentLabel}>{strings.messageLabel}</Text>
        <Text style={commentText}>{message}</Text>
      </Section>

      <Text style={replyHint}>
        {strings.replyHint
          .replace("{senderName}", senderName)
          .replace("{senderEmail}", senderEmail)}
      </Text>
    </EmailLayout>
  );
}

const logoSection: React.CSSProperties = {
  textAlign: "center" as const,
  marginBottom: "24px",
};

const logoImg: React.CSSProperties = {
  display: "block",
  border: 0,
  outline: "none",
  textDecoration: "none",
};

const contextLabel: React.CSSProperties = {
  fontSize: "13px",
  color: "#71717a",
  margin: "0 0 16px 0",
  lineHeight: "20px",
};

const intro: React.CSSProperties = {
  fontSize: "14px",
  color: "#52525b",
  margin: "0 0 20px 0",
  lineHeight: "22px",
};

const replyHint: React.CSSProperties = {
  fontSize: "13px",
  color: "#71717a",
  margin: "20px 0 0 0",
  lineHeight: "20px",
};
