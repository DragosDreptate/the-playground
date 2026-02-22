import { Button, Hr, Section, Text } from "@react-email/components";
import * as React from "react";
import { EmailLayout } from "./components/email-layout";

type Props = {
  url: string;
};

export function MagicLinkEmail({ url }: Props) {
  return (
    <EmailLayout
      preview="Votre lien de connexion à The Playground"
      footer="The Playground · Si vous n'avez pas demandé ce lien, ignorez cet email en toute sécurité."
    >
      <Section style={iconSection}>
        {/* Icône CSS pure — gradient + triangle border-trick.
            line-height + inline-block pour centrage email-compatible (pas de flex). */}
        <div style={iconBox}>
          <span style={triangle} />
        </div>
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

const iconSection: React.CSSProperties = {
  textAlign: "center" as const,
  marginBottom: "24px",
};

// Carré gradient 48×48 — même dégradé que le bouton CTA.
// line-height + text-align pour centrage email-compatible (flex non supporté).
// font-size:0 évite l'espace fantôme autour du span inline.
const iconBox: React.CSSProperties = {
  background: "linear-gradient(135deg, #ec4899, #a855f7)",
  borderRadius: "11px",
  width: "48px",
  height: "48px",
  lineHeight: "48px",
  textAlign: "center" as const,
  fontSize: "0",
  margin: "0 auto 8px auto",
};

// Triangle border-trick proportionnel à icon.tsx (polygon 13×15 dans un carré 32×32).
// À 48×48 : largeur ≈ 20px, hauteur ≈ 22px (= 2×11px).
// marginLeft: 3px = décalage optique vers la droite (comme marginLeft:"2px" dans icon.tsx).
const triangle: React.CSSProperties = {
  display: "inline-block",
  verticalAlign: "middle",
  width: 0,
  height: 0,
  borderTop: "11px solid transparent",
  borderBottom: "11px solid transparent",
  borderLeft: "20px solid #ffffff",
  marginLeft: "3px",
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
