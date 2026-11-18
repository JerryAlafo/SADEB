import type { Metadata } from "next";
import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { CabecalhoPublico, RodapePublico } from "@/components/cabecalho-publico";
import { painelDe, utilizadorActual } from "@/lib/auth";
import { obterI18n } from "@/lib/i18n/servidor";
import { latenciaPagina } from "@/lib/latencia";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await obterI18n()).t.negado.titulo };
}

/** Mostrado pelo proxy (HTTP 403) quando o perfil não tem acesso à rota pedida. */
export default async function AcessoNegado() {
  await latenciaPagina();
  const [{ t }, u] = await Promise.all([obterI18n(), utilizadorActual()]);
  return (
    <div className="flex min-h-screen flex-col">
      <CabecalhoPublico />
      <main className="flex flex-1 items-center justify-center px-4 py-16">
        <div className="cartao w-full max-w-lg border-t-[3px] border-t-danger px-8 py-10 text-center">
          <ShieldAlert className="mx-auto size-10 text-danger" strokeWidth={1.5} />
          <p className="mt-4 font-mono text-sm font-semibold text-danger">{t.negado.codigo}</p>
          <h1 className="mt-1 text-xl font-semibold text-fg">{t.negado.titulo}</h1>
          <p className="mt-2 text-sm text-muted">{t.negado.texto}</p>
          <Link href={u ? painelDe(u.papel) : "/"} className="btn-primario mt-7">
            {t.negado.voltar}
          </Link>
        </div>
      </main>
      <RodapePublico />
    </div>
  );
}
