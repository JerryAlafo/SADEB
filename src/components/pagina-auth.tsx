import Link from "next/link";
import type { ReactNode } from "react";
import { obterI18n } from "@/lib/i18n/servidor";
import { AlternarTema, SeletorIdioma } from "./preferencias";
import { Emblema } from "./ui";

/** Enquadramento das páginas de autenticação (centrado, como nos backoffices). */
export async function PaginaAuth({ titulo, instrucoes, largura = "max-w-md", children }: { titulo: string; instrucoes: string; largura?: string; children: ReactNode }) {
  const { t } = await obterI18n();
  return (
    <div className="flex min-h-screen flex-col bg-bg">
      <div className="flex justify-end gap-1 px-4 py-3">
        <SeletorIdioma />
        <AlternarTema />
      </div>
      <main className="flex flex-1 items-center justify-center px-4 pb-10">
        <div className={`w-full ${largura}`}>
          <div className="cartao border-t-[3px] border-t-primary px-6 py-8 sm:px-10">
            <Link href="/" className="mb-8 flex flex-col items-center gap-3 text-center">
              <Emblema className="size-12" />
              <span>
                <span className="block text-lg font-semibold tracking-wide text-fg">{t.app.sigla}</span>
                <span className="block text-xs text-muted">{t.app.nome}</span>
              </span>
            </Link>
            <h1 className="text-center text-base font-semibold text-fg">{titulo}</h1>
            <p className="mt-1 mb-7 text-center text-sm text-muted">{instrucoes}</p>
            {children}
          </div>
        </div>
      </main>
      <footer className="pb-6 text-center text-xs text-subtle">
        © {new Date().getFullYear()} {t.app.instituicao} · {t.app.departamento}
      </footer>
    </div>
  );
}
