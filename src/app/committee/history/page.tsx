import type { Metadata } from "next";
import Link from "next/link";
import { BotaoExportar } from "@/components/botao-exportar";
import { Cabecalho, Cartao, Distintivo, Indicador, Vazio } from "@/components/ui";
import { listar } from "@/lib/db";
import { TOM_RESULTADO } from "@/lib/estilos";
import { fmt } from "@/lib/i18n";
import { obterI18n } from "@/lib/i18n/servidor";
import { textoMotivo, textoPor } from "@/lib/textos";
import type { Bolsa, Decisao } from "@/lib/types";
import { cn } from "@/lib/utils";
import { latenciaPagina } from "@/lib/latencia";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await obterI18n()).t.comissao.historicoT };
}

export default async function Historico({ searchParams }: PageProps<"/committee/history">) {
  await latenciaPagina();
  const { bolsa: filtro } = await searchParams;
  const { t, f } = await obterI18n();
  const k = t.comissao;
  const [bolsas, decisoes] = await Promise.all([listar<Bolsa>("bolsas"), listar<Decisao>("decisoes")]);
  const comDecisoes = bolsas.filter((b) => decisoes.some((d) => d.bolsaId === b.id));
  const lista = decisoes
    .filter((d) => !filtro || d.bolsaId === filtro)
    .sort((a, b) => a.bolsaId.localeCompare(b.bolsaId) || (a.posicao ?? 9999) - (b.posicao ?? 9999));
  const titulo = (id: string) => bolsas.find((b) => b.id === id)?.titulo ?? "—";
  // Indicadores: apenas a decisão em vigor de cada candidato (a última, incluindo rectificações)
  const vigentes = [...new Map([...lista].sort((a, b) => a.decididoEm.localeCompare(b.decididoEm)).map((d) => [d.candidaturaId, d])).values()];
  const n = (r: Decisao["resultadoFinal"]) => vigentes.filter((d) => d.resultadoFinal === r).length;
  const alteradas = vigentes.filter((d) => d.alterado).length;

  const filtroCls = (on: boolean) => cn("inline-flex h-8 items-center rounded-sm border px-3 text-xs font-medium transition-colors", on ? "border-primary bg-primary text-primary-fg" : "border-line-strong bg-surface text-fg hover:bg-surface-2");

  return (
    <>
      <Cabecalho
        titulo={k.historicoT}
        subtitulo={k.historicoD}
        accoes={<BotaoExportar href={`/api/reports${filtro ? `?bolsa=${filtro}` : ""}`} />}
      />

      <div className="mb-5 flex flex-wrap gap-2">
        <Link href="/committee/history" className={filtroCls(!filtro)}>
          {k.todosConcursos}
        </Link>
        {comDecisoes.map((b) => (
          <Link key={b.id} href={`/committee/history?bolsa=${b.id}`} className={filtroCls(filtro === b.id)}>
            {b.titulo}
          </Link>
        ))}
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Indicador rotulo={k.kDecisoes} valor={vigentes.length} tom="primario" />
        <Indicador rotulo={k.kSel} valor={n("seleccionado")} tom="sucesso" />
        <Indicador rotulo={k.kEsp} valor={n("lista_espera")} tom="aviso" />
        <Indicador rotulo={k.kNao} valor={n("nao_seleccionado") + n("rejeitada")} tom="perigo" />
        <Indicador rotulo={k.kAlteradas} valor={alteradas} tom="destaque" nota={vigentes.length ? fmt(k.percDecisoes, { p: Math.round((alteradas / vigentes.length) * 100) }) : undefined} />
      </div>

      <Cartao corpo="">
        {lista.length === 0 ? (
          <Vazio titulo={k.semDecisoes}>{k.semDecisoesD}</Vazio>
        ) : (
          <div className="overflow-x-auto">
            <table className="tabela">
              <thead>
                <tr>
                  {!filtro && <th>{k.colConcurso}</th>}
                  <th className="text-right">#</th>
                  <th>{k.colCandidato}</th>
                  <th className="text-right">{k.colPontuacao}</th>
                  <th>{k.colSistema}</th>
                  <th>{k.colFinal}</th>
                  <th>{k.colJustificacao}</th>
                  <th>{k.colRegisto}</th>
                </tr>
              </thead>
              <tbody>
                {lista.map((d) => (
                  <tr key={d.id} className={d.alterado ? "bg-accent-soft/40" : ""}>
                    {!filtro && <td className="max-w-48 truncate text-xs text-muted">{titulo(d.bolsaId)}</td>}
                    <td className="text-right font-mono text-muted tabular-nums">{d.posicao ?? "—"}</td>
                    <td>
                      <Link href={`/committee/applications/${d.candidaturaId}`} className="font-medium hover:text-primary">
                        {d.candidatoNome}
                      </Link>
                      <p className="font-mono text-[11px] text-subtle">{d.codigo}</p>
                    </td>
                    <td className="text-right font-mono tabular-nums">{d.pontuacao?.toFixed(2) ?? "—"}</td>
                    <td>
                      <Distintivo tom={TOM_RESULTADO[d.resultadoSistema]}>{t.resultado[d.resultadoSistema]}</Distintivo>
                    </td>
                    <td>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Distintivo tom={TOM_RESULTADO[d.resultadoFinal]}>{t.resultado[d.resultadoFinal]}</Distintivo>
                        {d.rectificacao && <Distintivo tom="destaque">{k.rectificacao}</Distintivo>}
                      </div>
                    </td>
                    <td className="max-w-xs text-xs text-muted">{d.justificacao ?? d.motivos?.map((m) => textoMotivo(t, m)).join(" ") ?? "—"}</td>
                    <td className="font-mono text-[11px] whitespace-nowrap text-subtle">
                      {f.dataHora(d.decididoEm)}
                      <br />
                      {textoPor(t, d.decididoPor)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Cartao>
    </>
  );
}
