import { Button, Hr, Img, Section, Text } from "@react-email/components";
import * as React from "react";
import { EmailLayout } from "./components/email-layout";

// Icône PNG 64×64 encodée en base64 — générée depuis le même design que src/app/icon.tsx
// (gradient rose→violet 135°, triangle play blanc, coins arrondis)
// Embarquée directement dans le corps de l'email : aucune dépendance réseau.
const ICON_SRC =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAACvElEQVR42uWbiVIaQRCG5/W49uQBE3PHBBEBEREBAS8QEe8Lb3PnETqzByVYVBToXhb7q/of4Pthd2Z6QIghuQ28gZvgW5l3cC1zFXwv8wEugx/tXAQ/yXyGdnAa2qFpOA99kfkKZ6GYndPQjEwcTmSOQ7MyCTgKz9k5DCdlUnAQTtvZD8/LZGAvvGBnN5KVWYRWJAc7dpZAUHIfeAV3gdcyU2CJ+02+Gcnb2Y4syxSgESlCQykCivikym8pJZkVqCtlYC1vpaZUgLV8TanCprIKrOWtbChrwFp+XV23w1p+Td2Q2YQXs9QNI7+q1oC1vJWqWn8ogaN8Vd3qLoCffEVtQM++npt8RXtUADf5srYNrOXLWhNWtB0QnOXdAvjKl7QWCAp5i0mQL2m7ICg++W78LF90CsD/2vfDj/IFbQ8ExTP/P/wkX9D2nQKwX3hP4Rf5Zf0ABMXb/rmMW94tAH+pG5Rxyef1QxAU6/yweC2f149kAQSbnFHwUn5JPwZBscPDwAt5twD87S0mlPI5/QQExd4eGyr5nH7qFIB9sKECW35RPwNBcaqjBkveLQD/SOsVo8pnjXMQFOd5LxlFPmu0QVAMMyZFfsG4sArAn+TQi7dQ5DNWARRjLD8/893yGePSKQB7hkchTiE/b1yBoBhgToq8WwD+9BZnrW+Sy6eNaxAU01u/bHKekk8bN04B2KPrSZFPGbcgKOb2g4K5tx9EPmXaBeDP7Z8tjnywGVQ+ad6BoLi0GMepbhj5pHnvFIB9aTEp8nPmNxAUNzb9xeu+k3cLwL+uejzN8at8wvwOwm93dV7KJ8wfIDjLz5o/rQL4ysetAixYy1twlI+bv7oL4Cc/E/39UABH+d4CGMrHon96fzHOWt6Ck3ws+rf/v0ZYy3dgLd+BtXwH1vIdWMt282KWOkx8e7AZkH+VGkg8Cz4YKgAAAABJRU5ErkJggg==";

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
        <Img
          src={ICON_SRC}
          width={48}
          height={48}
          alt="The Playground"
          style={iconImage}
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

const iconSection: React.CSSProperties = {
  textAlign: "center" as const,
  marginBottom: "24px",
};

const iconImage: React.CSSProperties = {
  display: "block",
  margin: "0 auto 8px auto",
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
