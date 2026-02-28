import { Button, Section, Text } from "@react-email/components";
import * as React from "react";
import { EmailLayout } from "./components/email-layout";
import type { NewCommentEmailData } from "@/domain/ports/services/email-service";

type Props = NewCommentEmailData & {
  baseUrl: string;
};

export function NewCommentEmail({
  momentSlug,
  commentPreview,
  baseUrl,
  strings,
}: Props) {
  const viewUrl = `${baseUrl}/m/${momentSlug}`;

  return (
    <EmailLayout preview={strings.subject} footer={strings.footer}>
      <Text style={heading}>{strings.heading}</Text>

      <Text style={message}>{strings.message}</Text>

      <Section style={commentSection}>
        <Text style={commentLabel}>{strings.commentPreviewLabel}</Text>
        <Text style={commentText}>&ldquo;{commentPreview}&rdquo;</Text>
      </Section>

      <Section style={ctaSection}>
        <Button style={ctaButton} href={viewUrl}>
          {strings.viewCommentCta}
        </Button>
      </Section>
    </EmailLayout>
  );
}

const heading: React.CSSProperties = {
  fontSize: "16px",
  fontWeight: 600,
  color: "#18181b",
  margin: "0 0 16px 0",
  lineHeight: "24px",
};

const message: React.CSSProperties = {
  fontSize: "14px",
  color: "#52525b",
  margin: "0 0 20px 0",
  lineHeight: "22px",
};

const commentSection: React.CSSProperties = {
  backgroundColor: "#f4f4f5",
  borderRadius: "8px",
  padding: "12px 16px",
  marginBottom: "24px",
};

const commentLabel: React.CSSProperties = {
  fontSize: "11px",
  fontWeight: 600,
  color: "#71717a",
  textTransform: "uppercase" as const,
  letterSpacing: "0.05em",
  margin: "0 0 6px 0",
};

const commentText: React.CSSProperties = {
  fontSize: "14px",
  color: "#18181b",
  margin: "0",
  lineHeight: "22px",
  fontStyle: "italic",
};

const ctaSection: React.CSSProperties = {
  textAlign: "center" as const,
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
