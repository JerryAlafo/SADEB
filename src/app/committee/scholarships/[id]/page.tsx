import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { DetalhesBolsa } from "@/components/detalhes-bolsa";
import { EstadoCandidatura } from "@/components/lista-candidaturas";
import { Aviso, BarraPontuacao, Cabecalho, Cartao, Distintivo, Indicador, Vazio } from "@/components/ui";
import { listar, obter } from "@/lib/db";
import { TOM_ESTADO_BOLSA, TOM_RESULTADO } from "@/lib/estilos";
import { fmt, type Dicionario } from "@/lib/i18n";
import { obterI18n } from "@/lib/i18n/servidor";
import { classificar, prazoEncerrado } from "@/lib/motor";
import { textoMotivo, textoPendencia } from "@/lib/textos";
import type { Bolsa, Candidatura, Resultado, Utilizador } from "@/lib/types";
import { cn } from "@/lib/utils";
import { DecisaoCandidato, FormAprovar, FormCalculo } from "../../formularios";
import { latenciaPagina } from "@/lib/latencia";

type Linha = { c: Candidatura; nome: string; pontuacao: number; posicao: number; sistema: Resultado; final: Resultado };

function TabelaClassificacao({ linhas, vagas, modo, bloqueio, t }: { linhas: Linha[]; vagas: number; modo: "ajuste" | "rectificacao" | "bloqueado"; bloqueio?: string; t: Dicionario }) {
  const k = t.comissao;
  return (
    <div className="overflow-x-auto">
      <table className="tabela">
        <thead>
          <tr>
            <th className="w-14 text-right">#</th>
            <th>{k.colCandidato}</th>
            <th>{k.colPontuacao}</th>
            <th className="text-right">{k.colMedia}</th>
            <th>{k.colSistema}</th>
            <th>{k.colDecisao}</th>
            <th className="w-10" />
          </tr>
        </thead>
        <tbody>
          {linhas.map((l) => {
            const alterado = modo !== "bloqueado" && l.sistema !== l.final;
            return (
              <tr key={l.c.id} className={cn(l.posicao === vagas && "[&>td]:border-b-2 [&>td]:border-b-primary", alterado && "bg-accent-soft/40")}>
                <td className="text-right font-mono font-semibold text-muted tabular-nums">{String(l.posicao).padStart(2, "0")}</td>
                <td>
                  <Link href={`/committee/applications/${l.c.id}`} className="font-medium text-fg hover:text-primary">
                    {l.nome}
                  </Link>
                  <p className="font-mono text-[11px] text-subtle">
                    {l.c.codigo} · {l.c.dados.area}
                  </p>
                </td>
                <td>
                  <BarraPontuacao valor={l.pontuacao} />
                </td>
                <td className="text-right font-mono tabular-nums">{l.c.dados.media.toFixed(1)}</td>
                <td>
                  <Distintivo tom={TOM_RESULTADO[l.sistema]}>{t.resultado[l.sistema]}</Distintivo>
                </td>
                <td>
                  <DecisaoCandidato
                    candidaturaId={l.c.id}
                    resultadoSistema={l.sistema}
                    resultadoFinal={l.final}
                    justificacao={l.c.justificacaoAjuste}
                    rectificacao={modo === "rectificacao"}
                    bloqueio={modo === "bloqueado" ? bloqueio : undefined}
                    nome={l.nome}
                    codigo={l.c.codigo}
                  />
                  {alterado && (
                    <p className="mt-1.5 max-w-72 truncate text-xs text-accent" title={l.c.justificacaoAjuste}>
                      {k.ajustado}: {l.c.justificacaoAjuste}
                    </p>
                  )}
                </td>
                <td className="text-right">
                  <Link href={`/committee/applications/${l.c.id}`} className="inline-flex text-subtle hover:text-primary" aria-label={t.comum.ver} title={t.comum.ver}>
                    <ChevronRight className="size-4" />
                  </Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default async function AvaliacaoConcurso({ params }: PageProps<"/committee/scholarships/[id]">) {
  await latenciaPagina();
  const { id } = await params;
  const { t, f } = await obterI18n();
  const k = t.comissao;
  const bolsa = await obter<Bolsa>("bolsas", id);
  if (!bolsa || bolsa.estado === "rascunho") notFound();
  const [todas, utilizadores] = await Promise.all([listar<Candidatura>("candidaturas"), listar<Utilizador>("utilizadores")]);
  const nome = (uid: string) => utilizadores.find((u) => u.id === uid)?.nome ?? "—";
  const cands = todas.filter((c) => c.bolsaId === id);
  const conta = (e: Candidatura["estado"]) => cands.filter((c) => c.estado === e).length;
  const encerrado = prazoEncerrado(bolsa);

  const provisoria = bolsa.estado === "aberta";
  const linhas: Linha[] = provisoria
    ? classificar(bolsa, cands.filter((c) => c.estado === "elegivel")).map((r) => ({
        c: r.candidatura,
        nome: nome(r.candidatura.utilizadorId),
        pontuacao: r.pontuacao,
        posicao: r.posicao,
        sistema: r.resultado,
        final: r.resultado,
      }))
    : cands
        .filter((c) => (c.estado === "classificada" || c.estado === "decidida") && c.posicao)
        .sort((a, b) => a.posicao! - b.posicao!)
        .map((c) => ({ c, nome: nome(c.utilizadorId), pontuacao: c.pontuacao ?? 0, posicao: c.posicao!, sistema: c.resultadoSistema!, final: c.resultadoFinal! }));

  const sel = linhas.filter((l) => l.final === "seleccionado").length;
  const esp = linhas.filter((l) => l.final === "lista_espera").length;
  const aj = linhas.filter((l) => l.final !== l.sistema).length;
  const fora = cands.filter((c) => ["rascunho", "correcao_solicitada", "rejeitada"].includes(c.estado));
  const resumo = fmt(k.resumoTxt, { s: sel, v: bolsa.vagas, e: esp, n: linhas.length - sel - esp, a: aj });

  return (
    <>
      <Cabecalho
        voltar={{ href: "/committee/scholarships", rotulo: k.avaliacaoT }}
        sobretitulo={`${f.data(bolsa.dataAbertura)} – ${f.data(bolsa.dataEncerramento)} · ${fmt(t.bolsa.vagasTxt, { v: bolsa.vagas, e: bolsa.vagasListaEspera })}`}
        titulo={bolsa.titulo}
        accoes={<Distintivo tom={TOM_ESTADO_BOLSA[bolsa.estado]}>{t.estadoBolsa[bolsa.estado]}</Distintivo>}
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-3 xl:grid-cols-6">
        <Indicador rotulo={k.kRascunhos} valor={conta("rascunho")} nota={k.naoSubmetidas} tom="neutro" />
        <Indicador rotulo={k.kPorCorrigir} valor={conta("correcao_solicitada")} tom="aviso" />
        <Indicador rotulo={k.kRejeitadas} valor={conta("rejeitada")} tom="perigo" />
        <Indicador rotulo={k.kElegiveis} valor={conta("elegivel")} nota={k.aguardamCalculo} tom="info" />
        <Indicador rotulo={k.kClassificadas} valor={conta("classificada")} nota={k.aguardamDecisao} tom="destaque" />
        <Indicador rotulo={k.kComunicadas} valor={conta("decidida")} tom="sucesso" />
      </div>

      <Cartao titulo={k.proximoPasso} className="mb-6">
        {bolsa.estado === "aberta" && !encerrado && <Aviso titulo={k.faseCandidaturaT}>{fmt(k.faseCandidaturaD, { data: f.data(bolsa.dataEncerramento) })}</Aviso>}

        {bolsa.estado === "aberta" && encerrado && (
          <div className="flex flex-wrap items-center justify-between gap-6">
            <div className="max-w-3xl">
              <p className="text-sm font-semibold text-fg">{k.fase3T}</p>
              <p className="mt-1 text-sm text-muted">{fmt(k.fase3D, { vagas: bolsa.vagas, n: conta("correcao_solicitada") })}</p>
            </div>
            <FormCalculo bolsaId={bolsa.id} />
          </div>
        )}

        {bolsa.estado === "em_avaliacao" && (
          <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
            <div>
              <p className="text-sm font-semibold text-fg">{k.fase4T}</p>
              <p className="mt-1 text-sm text-muted">{fmt(k.fase4D, { data: f.dataHora(bolsa.calculadoEm) })}</p>
              <div className="mt-3">
                <Aviso titulo={k.alterarDecisao}>{k.instrucaoAjuste}</Aviso>
              </div>
              <dl className="mt-4 grid grid-cols-3 border border-line">
                {[
                  [k.resumoSel, `${sel} / ${bolsa.vagas}`, sel > bolsa.vagas],
                  [k.resumoEsp, esp, false],
                  [k.resumoAj, aj, false],
                ].map(([a, b, erro], i) => (
                  <div key={String(a)} className={cn("px-4 py-3", i && "border-l border-line")}>
                    <dt className="text-[11px] font-semibold tracking-wider text-subtle uppercase">{a}</dt>
                    <dd className={cn("mt-1 font-mono text-lg font-semibold tabular-nums", erro ? "text-danger" : "text-fg")}>{b}</dd>
                  </div>
                ))}
              </dl>
              {sel > bolsa.vagas && (
                <div className="mt-3">
                  <Aviso tom="erro">{k.excedeVagas}</Aviso>
                </div>
              )}
            </div>
            <div className="space-y-3 border-line lg:border-l lg:pl-6">
              <FormAprovar bolsaId={bolsa.id} resumo={resumo} />
              <FormCalculo bolsaId={bolsa.id} recalcular />
            </div>
          </div>
        )}

        {bolsa.estado === "concluida" && (
          <Aviso
            tom="sucesso"
            titulo={k.fase5T}
            accao={
              <Link href={`/committee/history?bolsa=${bolsa.id}`} className="btn-secundario btn-sm">
                {k.verHistorico}
              </Link>
            }
          >
            {fmt(k.fase5D, { data: f.dataHora(bolsa.publicadoEm) })} {k.decisoesBloqueadas}
          </Aviso>
        )}
      </Cartao>

      <Cartao titulo={provisoria ? k.classProvisoria : k.classificacao} descricao={linhas.length ? k.limiteVagas : undefined} className="mb-6" corpo="">
        {provisoria && (
          <div className="border-b border-line p-4">
            <Aviso
              tom={encerrado ? "aviso" : "info"}
              titulo={k.decisoesAposCalculoT}
              accao={encerrado ? <FormCalculo bolsaId={bolsa.id} /> : undefined}
            >
              {encerrado ? k.decisoesAposCalculoD : fmt(k.decisoesDuranteCandidatura, { data: f.data(bolsa.dataEncerramento) })}
            </Aviso>
          </div>
        )}
        {linhas.length ? (
          <TabelaClassificacao
            linhas={linhas}
            vagas={bolsa.vagas}
            modo={bolsa.estado === "em_avaliacao" ? "ajuste" : bolsa.estado === "concluida" ? "rectificacao" : "bloqueado"}
            bloqueio={encerrado ? k.decisaoIndisponivel : fmt(k.decisoesDuranteCandidatura, { data: f.data(bolsa.dataEncerramento) })}
            t={t}
          />
        ) : (
          <Vazio titulo={k.semElegiveis} />
        )}
      </Cartao>

      <Cartao titulo={`${k.foraClass} (${fora.length})`} className="mb-6" corpo="">
        {fora.length ? (
          <div className="overflow-x-auto">
            <table className="tabela">
              <thead>
                <tr>
                  <th>{k.colCandidato}</th>
                  <th>{t.comum.estado}</th>
                  <th>{k.colMotivo}</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {fora.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <p className="font-medium">{nome(c.utilizadorId)}</p>
                      <p className="font-mono text-[11px] text-subtle">{c.codigo}</p>
                    </td>
                    <td>
                      <EstadoCandidatura c={c} t={t} />
                    </td>
                    <td className="max-w-lg text-xs text-muted">
                      {c.estado === "rejeitada"
                        ? c.motivos?.map((m) => textoMotivo(t, m)).join(" ")
                        : c.estado === "correcao_solicitada"
                          ? c.pendencias.map((p) => textoPendencia(t, p)).join("; ")
                          : k.naoSubmetida}
                    </td>
                    <td className="text-right">
                      <Link href={`/committee/applications/${c.id}`} className="inline-flex text-subtle hover:text-primary" aria-label={t.comum.ver}>
                        <ChevronRight className="size-4" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="px-5 py-4 text-sm text-muted">{k.todasClass}</p>
        )}
      </Cartao>

      <details>
        <summary className="cursor-pointer list-none text-sm font-medium text-primary hover:underline">{k.criteriosAplicados}</summary>
        <div className="mt-4">
          <DetalhesBolsa bolsa={bolsa} t={t} f={f} />
        </div>
      </details>
    </>
  );
}
