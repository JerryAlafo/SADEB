import { ImageResponse } from "next/og";
import { COR_LATAO, COR_MARCA, EmblemaOg } from "@/lib/marca";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "SADEB — Sistema de Avaliação de Elegibilidade de Bolsas";

export default function ImagemPartilha() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", background: "#0c2129", padding: 80, color: "#fff" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
          <EmblemaOg tamanho={110} />
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontSize: 64, fontWeight: 700, letterSpacing: 4 }}>SADEB</span>
            <span style={{ fontSize: 26, color: "#9fb5bc" }}>Escola Superior de Ciências Náuticas</span>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={{ width: 90, height: 4, background: COR_LATAO }} />
          <span style={{ fontSize: 52, fontWeight: 600, lineHeight: 1.15 }}>Sistema de Avaliação de Elegibilidade de Bolsas</span>
          <span style={{ fontSize: 26, color: "#9fb5bc" }}>Candidatura · Elegibilidade · Avaliação · Decisão · Comunicação</span>
        </div>
        <div style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: 14, background: COR_MARCA }} />
      </div>
    ),
    size,
  );
}
