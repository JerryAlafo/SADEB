import type { NextConfig } from "next";
import { ROTAS_LEGADAS } from "./src/lib/rotas-legadas";

const nextConfig: NextConfig = {
  // Todas as páginas dependem da sessão (cookies) e da base de dados em ficheiros .txt,
  // por isso são renderizadas dinamicamente a cada pedido.
  experimental: {
    serverActions: {
      // Permite o envio de documentos comprovativos (PDF/imagens) até 10 MB.
      bodySizeLimit: "10mb",
    },
  },

  async redirects() {
    return [
      // Rotas antigas em português → rotas em inglês (favoritos, links antigos, notificações)
      ...ROTAS_LEGADAS.flatMap(([antiga, nova]) => [
        { source: antiga, destination: nova, permanent: true },
        { source: `${antiga}/:caminho*`, destination: `${nova}/:caminho*`, permanent: true },
      ]),
      // Páginas de listagem que não existem por si → ecrã mais próximo
      { source: "/committee/applications", destination: "/committee/scholarships", permanent: false },
      { source: "/scholarships", destination: "/#bolsas", permanent: false },
    ];
  },

  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
