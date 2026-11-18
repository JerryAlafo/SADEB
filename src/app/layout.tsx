import type { Metadata, Viewport } from "next";
import { IBM_Plex_Mono, IBM_Plex_Sans } from "next/font/google";
import { I18nProvider } from "@/components/i18n-provider";
import { COOKIE_TEMA } from "@/lib/i18n";
import { obterI18n, obterTema } from "@/lib/i18n/servidor";
import "./globals.css";

const plex = IBM_Plex_Sans({ variable: "--font-plex", subsets: ["latin"], weight: ["400", "500", "600", "700"] });
const plexMono = IBM_Plex_Mono({ variable: "--font-plex-mono", subsets: ["latin"], weight: ["400", "500"] });

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await obterI18n();
  return {
    title: { default: `${t.app.sigla} — ${t.app.nome}`, template: `%s · ${t.app.sigla}` },
    description: t.app.nome,
  };
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#0c2129" },
    { media: "(prefers-color-scheme: dark)", color: "#081316" },
  ],
};

// Sem preferência guardada, segue o tema do sistema operativo antes da primeira pintura.
const scriptTema = `(function(){try{if(!document.cookie.match(/(?:^|; )${COOKIE_TEMA}=/)&&matchMedia('(prefers-color-scheme: dark)').matches){document.documentElement.classList.add('dark')}}catch(e){}})()`;

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const [{ idioma }, tema] = await Promise.all([obterI18n(), obterTema()]);
  return (
    <html
      lang={idioma === "en" ? "en" : "pt"}
      className={`${plex.variable} ${plexMono.variable} h-full antialiased ${tema === "dark" ? "dark" : ""}`}
      suppressHydrationWarning
    >
      <head>{!tema && <script dangerouslySetInnerHTML={{ __html: scriptTema }} />}</head>
      <body className="flex min-h-full flex-col bg-bg font-sans text-fg">
        <I18nProvider idioma={idioma}>{children}</I18nProvider>
      </body>
    </html>
  );
}
