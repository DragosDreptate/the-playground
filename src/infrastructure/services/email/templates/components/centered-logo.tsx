import { Img } from "@react-email/components";
import * as React from "react";

type Props = {
  src: string;
  width?: number;
  height?: number;
  alt?: string;
};

/**
 * Centrage robuste d'un logo pour Outlook Word renderer (2016+) : wrapper
 * `<table align="center">`. `display: block` + `margin: auto` ne fonctionne
 * pas dans Outlook Desktop.
 */
export function CenteredLogo({
  src,
  width = 180,
  height = 32,
  alt = "The Playground",
}: Props) {
  return (
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
              src={src}
              width={String(width)}
              height={String(height)}
              alt={alt}
              style={logoImg}
            />
          </td>
        </tr>
      </tbody>
    </table>
  );
}

const logoImg: React.CSSProperties = {
  display: "block",
  border: 0,
  outline: "none",
  textDecoration: "none",
};
