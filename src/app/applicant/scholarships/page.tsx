import type { Metadata } from "next";
import Link from "next/link";
import { Cabecalho, Distintivo, ListaDados, Vazio } from "@/components/ui";
import { exigirUtilizador } from "@/lib/auth";
import { listar } from "@/lib/db";
import { fmt } from "@/lib/i18n";
import { obterI18n } from "@/lib/i18n/servidor";
import { dentroDoPrazo } from "@/lib/motor";
import type { Bolsa, Candidatura } from "@/lib/types";
import { latenciaPagina } from "@/lib/latencia";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await obterI18n()).t.candidato.concursosT };
}

export default async function ConcursosAbertos() {
  await latenciaPagina();
  const u = await exigirUtilizador("candidato");
  const { t, f } = await obterI18n();
  const c = t.candidato;
  const [bolsas, cands] = await Promise.all([listar<Bolsa>("bolsas"), listar<Candidatura>("candidaturas")]);
  const abertas = bolsas.filter((b) => b.estado === "aberta" && dentroDoPrazo(b)).sort((a, b) => a.dataEncerramento.localeCompare(b.dataEncerramento));

  return (
    <>
      <Cabecalho titulo={c.concursosT} subtitulo={c.concursosD} />
      {abertas.length === 0 && (
        <div className="cartao">
          <Vazio titulo={t.publico.semConcursos} />
        </div>
      )}
      <div className="grid gap-4 lg:grid-cols-2">
        {abertas.map((b) => {
          const minha = cands.find((x) => x.bolsaId === b.id && x.utilizadorId === u.id);
          return (
            <article key={b.id} className="cartao flex flex-col">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-5 py-3">
                <p className="truncate font-mono text-[11px] tracking-wide text-subtle uppercase">{b.entidade}</p>
                <div className="flex gap-2">
                  {minha && <Distintivo tom="info">{c.jaCandidatou}</Distintivo>}
                  <Distintivo tom="sucesso">{fmt(t.comum.ate, { data: f.data(b.dataEncerramento) })}</Distintivo>
                </div>
              </div>
              <div className="flex flex-1 flex-col px-5 py-4">
                <h2 className="text-base font-semibold text-fg">{b.titulo}</h2>
                <p className="mt-1 flex-1 text-sm text-muted">{b.descricao}</p>
                <div className="mt-4 border-t border-line pt-4">
                  <ListaDados
                    colunas={3}
                    itens={[
                      [t.bolsa.vagas, String(b.vagas)],
                      [c.mediaMin, String(b.requisitos.mediaMinima)],
                      [c.rendMax, b.requisitos.rendimentoPerCapitaMax ? f.mzn(b.requisitos.rendimentoPerCapitaMax) : t.bolsa.semLimite],
                    ]}
                  />
                </div>
              </div>
              <div className="flex justify-end border-t border-line bg-surface-2 px-5 py-3">
                <Link href={minha ? `/applicant/applications/${minha.id}` : `/scholarships/${b.id}`} className={minha ? "btn-secundario btn-sm" : "btn-primario btn-sm"}>
                  {minha ? c.abrirCandidatura : c.verConcurso}
                </Link>
              </div>
            </article>
          );
        })}
      </div>
    </>
  );
}
