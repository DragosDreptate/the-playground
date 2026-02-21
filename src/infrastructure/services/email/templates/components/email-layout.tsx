import {
  Body,
  Container,
  Head,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import * as React from "react";

type EmailLayoutProps = {
  preview: string;
  footer: string;
  children: React.ReactNode;
};

export function EmailLayout({ preview, footer, children }: EmailLayoutProps) {
  return (
    <Html>
      <Head />
      <Preview>{preview}</Preview>
      <Body style={body}>
        <Container style={container}>
          <Section style={content}>{children}</Section>
          <Text style={footerStyle}>{footer}</Text>
        </Container>
      </Body>
    </Html>
  );
}

const body: React.CSSProperties = {
  backgroundColor: "#f4f4f5",
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  margin: 0,
  padding: 0,
};

const container: React.CSSProperties = {
  maxWidth: "520px",
  margin: "0 auto",
  padding: "40px 20px",
};

const content: React.CSSProperties = {
  backgroundColor: "#ffffff",
  borderRadius: "12px",
  padding: "32px",
};

const footerStyle: React.CSSProperties = {
  color: "#a1a1aa",
  fontSize: "12px",
  textAlign: "center" as const,
  marginTop: "24px",
  lineHeight: "20px",
};
