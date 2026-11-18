import { notFound } from "next/navigation";
import { CheckCircle2, CircleAlert, Trash2 } from "lucide-react";
import { removerDocumentoAction } from "@/app/actions/candidato";
import { DetalhesBolsa } from "@/components/detalhes-bolsa";
import { BotaoSubmeter } from "@/components/formularios";
import { FluxoCandidatura, Historico } from "@/components/fluxo";
import { EstadoCandidatura } from "@/components/lista-candidaturas";
import { DecomposicaoPontuacao } from "@/components/pontuacao";
import { Aviso, Cabecalho, Cartao, ListaDados } from "@/components/ui";
import { exigirUtilizador } from "@/lib/auth";
import { obter } from "@/lib/db";
import { fmt } from "@/lib/i18n";
import { obterI18n } from "@/lib/i18n/servidor";
import { dentroDoPrazo, rendimentoPerCapita } from "@/lib/motor";
import { AREAS_ESTUDO } from "@/lib/padroes";
import { textoMotivo, textoPendencia } from "@/lib/textos";
import type { Bolsa, Candidatura } from "@/lib/types";
import { CarregarDocumento, FormularioDados } from "./formularios";
import { latenciaPagina } from "@/lib/latencia";

export default async function PaginaCandidatura({ params }: PageProps<"/applicant/applications/[id]">) {
  await latenciaPagina();
  const { id } = await params;
  const u = await exigirUtilizador("candidato");
  const { t, f } = await obterI18n();
  const k = t.candidatura;
  const c = await obter<Candidatura>("candidaturas", id);
  if (!c || c.utilizadorId !== u.id) notFound();
  const bolsa = (await obter<Bolsa>("bolsas", c.bolsaId))!;
  const editavel = (c.estado === "rascunho" || c.estado === "correcao_solicitada") && bolsa.estado === "aberta" && dentroDoPrazo(bolsa);
  const areas = [...new Set([...bolsa.requisitos.areasElegiveis, ...AREAS_ESTUDO])];
  const d = c.dados;

  return (
    <>
      <Cabecalho
        voltar={{ href: "/applicant/applications", rotulo: t.candidato.minhas }}
        sobretitulo={c.codigo}
        titulo={bolsa.titulo}
        subtitulo={fmt(k.prazoAte, { data: f.data(bolsa.dataEncerramento) })}
        accoes={<EstadoCandidatura c={c} t={t} />}
      />

      <div className="mb-6">
        <FluxoCandidatura candidatura={c} t={t} />
      </div>

      <div className="mb-6 space-y-3 empty:hidden">
        {c.estado === "rascunho" && editavel && <Aviso titulo={k.rascunhoT}>{k.rascunhoD}</Aviso>}
        {c.estado === "correcao_solicitada" && (
          <Aviso tom="aviso" titulo={k.correcaoT}>
            <ul className="list-disc pl-4">
              {c.pendencias.map((p) => (
                <li key={p}>{textoPendencia(t, p)}</li>
              ))}
            </ul>
          </Aviso>
        )}
        {!editavel && (c.estado === "rascunho" || c.estado === "correcao_solicitada") && (
          <Aviso tom="erro" titulo={k.prazoTerminouT}>
            {k.prazoTerminouD}
          </Aviso>
        )}
        {c.estado === "rejeitada" && (
          <Aviso tom="erro" titulo={k.rejeitadaT}>
            {c.motivos?.map((m) => textoMotivo(t, m)).join(" ")}
          </Aviso>
        )}
        {c.estado === "elegivel" && (
          <Aviso tom="sucesso" titulo={k.elegivelT}>
            {fmt(k.elegivelD, { data: f.data(bolsa.dataEncerramento) })}
          </Aviso>
        )}
        {c.estado === "classificada" && <Aviso titulo={k.emAnalise}>{k.classificadaD}</Aviso>}
      </div>

      {c.estado === "decidida" && c.resultadoFinal && (
        <Cartao titulo={k.resultadoOficial} className="mb-6" corpo="">
          <dl className="grid border-b border-line sm:grid-cols-3">
            {[
              [k.resultado, t.resultado[c.resultadoFinal]],
              [k.pontuacao, `${c.pontuacao?.toFixed(2)} / 100`],
              [k.posicao, fmt(t.comum.lugar, { n: c.posicao ?? "—" })],
            ].map(([a, b], i) => (
              <div key={a} className={`px-5 py-4 ${i ? "border-t border-line sm:border-t-0 sm:border-l" : ""}`}>
                <dt className="text-[11px] font-semibold tracking-wider text-subtle uppercase">{a}</dt>
                <dd className="mt-1 text-lg font-semibold text-fg">{b}</dd>
              </div>
            ))}
          </dl>
          {c.detalhePontuacao && <DecomposicaoPontuacao detalhe={c.detalhePontuacao} total={c.pontuacao ?? 0} t={t} f={f} />}
          {c.justificacaoAjuste && (
            <div className="border-t border-line p-5">
              <Aviso titulo={k.ajustadaT}>{c.justificacaoAjuste}</Aviso>
            </div>
          )}
        </Cartao>
      )}

      <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <div className="space-y-6">
          <Cartao titulo={editavel ? k.dados : k.dadosSubmetidos}>
            {editavel ? (
              <FormularioDados id={c.id} dados={d} areas={areas} />
            ) : (
              <div className="space-y-5">
                <ListaDados
                  colunas={3}
                  itens={[
                    [k.instituicao, d.instituicao],
                    [k.curso, d.curso],
                    [k.area, d.area],
                    [k.anoFrequencia, fmt(t.comum.anoFreq, { n: d.anoFrequencia })],
                    [t.campos.media, fmt(t.comum.valores, { n: d.media })],
                    [k.rendimentoAgregado, f.mzn(d.rendimentoFamiliar)],
                    [k.agregado, fmt(t.comum.pessoas, { n: d.agregadoFamiliar })],
                    [k.perCapita, f.mzn(rendimentoPerCapita(c))],
                    [k.distanciaCurta, `${d.distanciaKm} km`],
                    [k.orfaoCurto, d.orfao ? t.comum.sim : t.comum.nao],
                    [k.deficienciaCurto, d.deficiencia ? t.comum.sim : t.comum.nao],
                    [k.actividadesCurta, fmt(t.comum.nivel, { n: d.actividadesExtra })],
                  ]}
                />
                <div className="border-t border-line pt-4">
                  <p className="text-[11px] font-semibold tracking-wider text-subtle uppercase">{k.secMotivacao}</p>
                  <p className="mt-1 text-sm whitespace-pre-line text-fg">{d.motivacao || "—"}</p>
                </div>
              </div>
            )}
          </Cartao>

          <Cartao titulo={k.documentos} descricao={editavel ? k.formatos : undefined} corpo="">
            <ul className="divide-y divide-line">
              {bolsa.documentosObrigatorios.map((tipo) => {
                const doc = c.documentos.find((x) => x.tipo === tipo);
                return (
                  <li key={tipo} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5">
                    <div className="flex min-w-0 items-start gap-3">
                      {doc ? <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" /> : <CircleAlert className="mt-0.5 size-4 shrink-0 text-warning" />}
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-fg">{tipo}</p>
                        {doc ? (
                          <p className="mt-0.5 truncate text-xs text-muted">
                            <a href={`/api/documents/${doc.id}`} target="_blank" className="text-primary hover:underline">
                              {doc.nomeOriginal}
                            </a>
                            <span className="font-mono"> · {(doc.tamanho / 1024).toFixed(0)} KB · {f.dataHora(doc.carregadoEm)}</span>
                          </p>
                        ) : (
                          <p className="mt-0.5 text-xs text-warning">{k.emFalta}</p>
                        )}
                      </div>
                    </div>
                    {editavel && (
                      <div className="flex w-full items-center gap-1 sm:w-auto">
                        <CarregarDocumento id={c.id} tipo={tipo} substituir={!!doc} />
                        {doc && (
                          <form action={removerDocumentoAction}>
                            <input type="hidden" name="id" value={c.id} />
                            <input type="hidden" name="docId" value={doc.id} />
                            <BotaoSubmeter
                              className="btn-fantasma btn-sm px-2 text-danger hover:bg-danger-soft"
                              pendente=""
                              aria-label={k.remover}
                              title={k.remover}
                              confirmar={{ titulo: k.confirmarRemoverT, mensagem: fmt(k.confirmarRemover, { nome: doc.nomeOriginal }), tom: "perigo", rotulo: k.remover }}
                            >
                              <Trash2 className="size-3.5" />
                            </BotaoSubmeter>
                          </form>
                        )}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </Cartao>
        </div>

        <Cartao titulo={k.historico}>
          <Historico eventos={c.historico} t={t} f={f} />
        </Cartao>
      </div>

      <details className="group mt-8">
        <summary className="cursor-pointer list-none text-sm font-medium text-primary hover:underline">{k.verCriterios}</summary>
        <div className="mt-4">
          <DetalhesBolsa bolsa={bolsa} t={t} f={f} />
        </div>
      </details>
    </>
  );
}
