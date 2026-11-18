import { notFound } from "next/navigation";
import { CheckCircle2, CircleAlert, FileText } from "lucide-react";
import { FluxoCandidatura, Historico } from "@/components/fluxo";
import { EstadoCandidatura } from "@/components/lista-candidaturas";
import { DecomposicaoPontuacao } from "@/components/pontuacao";
import { Aviso, Cabecalho, Cartao, Distintivo, ListaDados } from "@/components/ui";
import { listar, obter } from "@/lib/db";
import { TOM_RESULTADO } from "@/lib/estilos";
import { fmt } from "@/lib/i18n";
import { obterI18n } from "@/lib/i18n/servidor";
import { calcularPontuacao, dentroDoPrazo, idade, rendimentoPerCapita, verificarRequisitos } from "@/lib/motor";
import { textoMotivo, textoPendencia } from "@/lib/textos";
import type { Bolsa, Candidatura, Utilizador } from "@/lib/types";
import { FormAjuste, FormCorreccao } from "../../formularios";
import { latenciaPagina } from "@/lib/latencia";

export default async function CandidaturaComissao({ params }: PageProps<"/committee/applications/[id]">) {
  await latenciaPagina();
  const { id } = await params;
  const { t, f } = await obterI18n();
  const k = t.comissao;
  const kc = t.candidatura;
  const c = await obter<Candidatura>("candidaturas", id);
  if (!c) notFound();
  const bolsa = (await obter<Bolsa>("bolsas", c.bolsaId))!;
  const cand = (await listar<Utilizador>("utilizadores")).find((u) => u.id === c.utilizadorId);
  const anos = idade(cand?.dataNascimento);
  const d = c.dados;

  const persistida = !!c.detalhePontuacao && c.pontuacao !== undefined;
  const estimativa = !persistida && c.estado === "elegivel" ? calcularPontuacao(bolsa, c) : undefined;
  const requisitos = c.estado !== "rascunho" ? verificarRequisitos(bolsa, c, cand?.dataNascimento) : [];

  return (
    <>
      <Cabecalho
        voltar={{ href: `/committee/scholarships/${bolsa.id}`, rotulo: bolsa.titulo }}
        sobretitulo={c.codigo}
        titulo={cand?.nome ?? "—"}
        subtitulo={c.submetidaEm ? fmt(k.submetidaEm, { data: f.dataHora(c.submetidaEm) }) : k.naoSubmetida}
        accoes={
          <>
            <EstadoCandidatura c={c} t={t} />
            {c.estado === "classificada" && c.resultadoFinal && <Distintivo tom={TOM_RESULTADO[c.resultadoFinal]}>{t.resultado[c.resultadoFinal]}</Distintivo>}
          </>
        }
      />

      <div className="mb-6">
        <FluxoCandidatura candidatura={c} t={t} />
      </div>

      {(c.estado === "rejeitada" || c.estado === "correcao_solicitada") && (
        <div className="mb-6">
          {c.estado === "rejeitada" ? (
            <Aviso tom="erro" titulo={kc.rejeitadaT}>
              {c.motivos?.map((m) => textoMotivo(t, m)).join(" ")}
            </Aviso>
          ) : (
            <Aviso tom="aviso" titulo={t.estadoCand.correcao_solicitada}>
              {c.pendencias.map((p) => textoPendencia(t, p)).join("; ")}
            </Aviso>
          )}
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <div className="space-y-6">
          {(persistida || estimativa) && (
            <Cartao
              titulo={persistida ? fmt(k.pontuacaoCalc, { lugar: fmt(t.comum.lugar, { n: c.posicao ?? "—" }) }) : k.pontuacaoEst}
              accoes={c.resultadoSistema && <Distintivo tom={TOM_RESULTADO[c.resultadoSistema]}>{fmt(k.sistemaRes, { r: t.resultado[c.resultadoSistema] })}</Distintivo>}
              corpo=""
            >
              <DecomposicaoPontuacao detalhe={persistida ? c.detalhePontuacao! : estimativa!.detalhe} total={persistida ? c.pontuacao! : estimativa!.pontuacao} t={t} f={f} />
              {c.justificacaoAjuste && (
                <div className="border-t border-line p-5">
                  <Aviso titulo={fmt(k.ajusteT, { de: t.resultado[c.resultadoSistema!], para: t.resultado[c.resultadoFinal!] })}>{c.justificacaoAjuste}</Aviso>
                </div>
              )}
            </Cartao>
          )}

          <Cartao titulo={k.dadosCandidato}>
            <div className="space-y-5">
              <ListaDados
                colunas={3}
                itens={[
                  [t.auth.email, cand?.email],
                  [t.auth.telefone, cand?.telefone],
                  [t.auth.bi, cand?.bi],
                  [t.auth.dataNascimento, cand?.dataNascimento ? `${f.data(cand.dataNascimento)} (${fmt(t.comum.anos, { n: anos ?? "—" })})` : "—"],
                  [kc.instituicao, d.instituicao],
                  [kc.curso, d.curso],
                  [kc.area, d.area],
                  [kc.anoFrequencia, fmt(t.comum.anoFreq, { n: d.anoFrequencia })],
                  [t.campos.media, fmt(t.comum.valores, { n: d.media })],
                  [kc.rendimentoAgregado, f.mzn(d.rendimentoFamiliar)],
                  [kc.agregado, fmt(t.comum.pessoas, { n: d.agregadoFamiliar })],
                  [kc.perCapita, f.mzn(rendimentoPerCapita(c))],
                  [kc.orfaoCurto, d.orfao ? t.comum.sim : t.comum.nao],
                  [kc.deficienciaCurto, d.deficiencia ? t.comum.sim : t.comum.nao],
                  [kc.actividadesCurta, fmt(t.comum.nivel, { n: d.actividadesExtra })],
                ]}
              />
              <div className="border-t border-line pt-4">
                <p className="text-[11px] font-semibold tracking-wider text-subtle uppercase">{kc.secMotivacao}</p>
                <p className="mt-1 text-sm whitespace-pre-line text-fg">{d.motivacao || "—"}</p>
              </div>
            </div>
          </Cartao>

          <Cartao titulo={kc.documentos} corpo="">
            <ul className="divide-y divide-line">
              {bolsa.documentosObrigatorios.map((tipo) => {
                const doc = c.documentos.find((x) => x.tipo === tipo);
                return (
                  <li key={tipo} className="flex items-center justify-between gap-3 px-5 py-3">
                    <span className="flex items-center gap-3 text-sm">
                      {doc ? <CheckCircle2 className="size-4 text-success" /> : <CircleAlert className="size-4 text-warning" />}
                      {tipo}
                    </span>
                    {doc ? (
                      <a href={`/api/documents/${doc.id}`} target="_blank" className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline">
                        <FileText className="size-3.5" />
                        {doc.nomeOriginal}
                      </a>
                    ) : (
                      <span className="text-xs text-warning">{kc.emFalta}</span>
                    )}
                  </li>
                );
              })}
            </ul>
          </Cartao>
        </div>

        <div className="space-y-6">
          {(c.estado === "classificada" || (c.estado === "decidida" && bolsa.estado === "concluida")) && (
            <Cartao titulo={c.estado === "decidida" ? k.rectificar : k.decisaoComissao}>
              <FormAjuste
                candidaturaId={c.id}
                resultadoSistema={c.resultadoSistema!}
                resultadoFinal={c.resultadoFinal!}
                justificacao={c.justificacaoAjuste}
                rectificacao={c.estado === "decidida"}
              />
            </Cartao>
          )}
          {c.estado === "elegivel" && dentroDoPrazo(bolsa) && (
            <Cartao titulo={k.pedirCorreccao}>
              <FormCorreccao candidaturaId={c.id} />
            </Cartao>
          )}
          {c.estado !== "rascunho" && (
            <Cartao titulo={k.verificacaoReq}>
              {requisitos.length ? (
                <ul className="space-y-2 text-sm text-danger">
                  {requisitos.map((r) => (
                    <li key={r.chave} className="flex gap-2">
                      <CircleAlert className="mt-0.5 size-4 shrink-0" />
                      {textoMotivo(t, r)}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="flex items-center gap-2 text-sm text-success">
                  <CheckCircle2 className="size-4" />
                  {k.cumpreTodos}
                </p>
              )}
            </Cartao>
          )}
          <Cartao titulo={k.rastoAuditoria}>
            <Historico eventos={c.historico} t={t} f={f} />
          </Cartao>
        </div>
      </div>
    </>
  );
}
