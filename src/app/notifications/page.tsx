import type { Metadata } from "next";
import Link from "next/link";
import { CheckCheck } from "lucide-react";
import { marcarNotificacoesLidas } from "@/app/actions/candidato";
import { BotaoSubmeter } from "@/components/formularios";
import { Cabecalho, Cartao, Distintivo, Vazio } from "@/components/ui";
import { exigirUtilizador } from "@/lib/auth";
import { listar } from "@/lib/db";
import { obterI18n } from "@/lib/i18n/servidor";
import { actualizarLink } from "@/lib/rotas-legadas";
import { textoNotificacao } from "@/lib/textos";
import type { Notificacao } from "@/lib/types";
import { cn } from "@/lib/utils";
import { latenciaPagina } from "@/lib/latencia";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await obterI18n()).t.notificacoes.titulo };
}

const BARRA = { info: "bg-info", sucesso: "bg-success", aviso: "bg-warning", erro: "bg-danger" };

export default async function Notificacoes() {
  await latenciaPagina();
  const u = await exigirUtilizador();
  const { t, f } = await obterI18n();
  const lista = (await listar<Notificacao>("notificacoes")).filter((n) => n.utilizadorId === u.id).sort((a, b) => b.criadaEm.localeCompare(a.criadaEm));
  const naoLidas = lista.filter((n) => !n.lida).length;

  return (
    <>
      <Cabecalho
        titulo={t.notificacoes.titulo}
        subtitulo={t.notificacoes.subtitulo}
        accoes={
          naoLidas > 0 && (
            <form action={marcarNotificacoesLidas}>
              <BotaoSubmeter className="btn-secundario">
                <CheckCheck className="size-4" />
                {t.notificacoes.marcarLidas} ({naoLidas})
              </BotaoSubmeter>
            </form>
          )
        }
      />
      <Cartao corpo="">
        {lista.length === 0 ? (
          <Vazio titulo={t.notificacoes.vazio} />
        ) : (
          <ul className="divide-y divide-line">
            {lista.map((n) => {
              const { titulo, mensagem } = textoNotificacao(t, n);
              return (
                <li key={n.id} className={cn("relative flex gap-4 px-5 py-4", !n.lida && "bg-surface-2")}>
                  <span className={cn("absolute inset-y-0 left-0 w-[3px]", n.lida ? "bg-transparent" : BARRA[n.tipo])} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className={cn("text-sm", n.lida ? "text-fg" : "font-semibold text-fg")}>{titulo}</p>
                      {!n.lida && <Distintivo tom="primario">{t.notificacoes.nova}</Distintivo>}
                    </div>
                    <p className="mt-1 text-sm text-muted">{mensagem}</p>
                    <p className="mt-1.5 font-mono text-[11px] text-subtle">{f.dataHora(n.criadaEm)}</p>
                  </div>
                  {n.link && (
                    <Link href={actualizarLink(n.link)!} className="btn-secundario btn-sm self-center">
                      {t.comum.abrir}
                    </Link>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Cartao>
    </>
  );
}
