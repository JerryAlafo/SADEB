import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "SADEB — Sistema de Avaliação de Elegibilidade de Bolsas",
    short_name: "SADEB",
    description: "Sistema de Suporte à Decisão para análise de elegibilidade e classificação de candidatos a bolsas de estudo.",
    start_url: "/",
    display: "standalone",
    background_color: "#f3f4f6",
    theme_color: "#0c2129",
    lang: "pt",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png" },
    ],
  };
}
