import { Button, Hr, Img, Section, Text } from "@react-email/components";
import * as React from "react";
import { EmailLayout } from "./components/email-layout";

type Props = {
  url: string;
  baseUrl: string;
};

export function MagicLinkEmail({ url, baseUrl }: Props) {
  return (
    <EmailLayout
      preview="Votre lien de connexion à The Playground"
      footer="The Playground · Si vous n'avez pas demandé ce lien, ignorez cet email en toute sécurité."
    >
      <Section style={brandSection}>
        <Img
          src={`${baseUrl}/icon.png`}
          width={40}
          height={40}
          alt="The Playground"
          style={iconStyle}
        />
        <Text style={brandName}>The Playground</Text>
      </Section>

      <Text style={heading}>Votre lien de connexion</Text>
      <Text style={bodyText}>
        Cliquez sur le bouton ci-dessous pour vous connecter. Ce lien est valable{" "}
        <strong>15 minutes</strong> et ne peut être utilisé qu'une seule fois.
      </Text>

      <Section style={ctaSection}>
        <Button style={ctaButton} href={url}>
          Se connecter →
        </Button>
      </Section>

      <Text style={expiryText}>Expire dans 15 minutes · Usage unique</Text>

      <Hr style={separator} />

      <Text style={securityText}>
        Vous n'avez pas demandé ce lien ? Votre compte reste sécurisé — ignorez
        simplement cet email.
      </Text>
    </EmailLayout>
  );
}

const brandSection: React.CSSProperties = {
  textAlign: "center" as const,
  marginBottom: "24px",
};

const iconStyle: React.CSSProperties = {
  borderRadius: "10px",
  margin: "0 auto 8px auto",
  display: "block",
};

const brandName: React.CSSProperties = {
  fontSize: "13px",
  fontWeight: 700,
  color: "#18181b",
  letterSpacing: "0.3px",
  textTransform: "uppercase" as const,
  margin: 0,
  textAlign: "center" as const,
};

const heading: React.CSSProperties = {
  fontSize: "20px",
  fontWeight: 700,
  color: "#18181b",
  textAlign: "center" as const,
  margin: "0 0 12px 0",
  lineHeight: "28px",
};

const bodyText: React.CSSProperties = {
  fontSize: "14px",
  color: "#52525b",
  textAlign: "center" as const,
  margin: "0 0 28px 0",
  lineHeight: "22px",
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
  padding: "12px 40px",
  textDecoration: "none",
  display: "inline-block",
};

const expiryText: React.CSSProperties = {
  fontSize: "12px",
  color: "#a1a1aa",
  textAlign: "center" as const,
  margin: "0 0 24px 0",
};

const separator: React.CSSProperties = {
  borderTop: "1px solid #e4e4e7",
  margin: "0 0 16px 0",
};

const securityText: React.CSSProperties = {
  fontSize: "12px",
  color: "#71717a",
  textAlign: "center" as const,
  margin: 0,
  lineHeight: "20px",
};
