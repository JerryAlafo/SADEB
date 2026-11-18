import Link from "next/link";
import { painelDe, utilizadorActual } from "@/lib/auth";
import { obterI18n } from "@/lib/i18n/servidor";
import { AlternarTema, SeletorIdioma } from "./preferencias";
import { Emblema } from "./ui";

export async function CabecalhoPublico() {
  const [u, { t }] = await Promise.all([utilizadorActual(), obterI18n()]);
  return (
    <header className="border-b border-line bg-surface">
      <div className="mx-auto flex h-16 max-w-[1280px] items-center justify-between gap-4 px-4 sm:px-8">
        <Link href="/" className="flex min-w-0 items-center gap-3">
          <Emblema className="size-9 shrink-0" />
          <span className="min-w-0 leading-tight">
            <span className="block text-sm font-semibold tracking-wide text-fg">{t.app.sigla}</span>
            <span className="hidden truncate text-xs text-muted sm:block">{t.app.instituicao}</span>
          </span>
        </Link>
        <nav className="flex items-center gap-1">
          <SeletorIdioma />
          <AlternarTema />
          <span className="mx-2 hidden h-7 w-px bg-line sm:block" />
          {u ? (
            <Link href={painelDe(u.papel)} className="btn-primario">
              {t.publico.aceder}
            </Link>
          ) : (
            <>
              <Link href="/auth" className="btn-fantasma hidden sm:inline-flex">
                {t.publico.entrar}
              </Link>
              <Link href="/register" className="btn-primario">
                {t.publico.criarConta}
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}

export async function RodapePublico() {
  const { t } = await obterI18n();
  return (
    <footer className="mt-auto border-t border-line bg-surface">
      <div className="mx-auto flex max-w-[1280px] flex-wrap items-center justify-between gap-2 px-4 py-5 text-xs text-subtle sm:px-8">
        <span>
          © {new Date().getFullYear()} {t.app.instituicao} · {t.app.departamento}
        </span>
        <span>
          {t.app.sigla} — {t.app.nome}
        </span>
      </div>
    </footer>
  );
}
