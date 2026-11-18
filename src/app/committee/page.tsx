import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle, ChevronRight } from "lucide-react";
import { Cabecalho, Cartao, Distintivo, Indicador, Vazio } from "@/components/ui";
import { exigirUtilizador } from "@/lib/auth";
import { listar } from "@/lib/db";
import { proximaAccao, TOM_ESTADO_BOLSA } from "@/lib/estilos";
import { fmt } from "@/lib/i18n";
import { obterI18n } from "@/lib/i18n/servidor";
import type { Bolsa, Candidatura, Decisao } from "@/lib/types";
import { latenciaPagina } from "@/lib/latencia";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await obterI18n()).t.comissao.painelT };
}

export default async function PainelComissao() {
  await latenciaPagina();
  await exigirUtilizador("comissao", "admin");
  const { t, f } = await obterI18n();
  const k = t.comissao;
  const [bolsas, cands, decisoes] = await Promise.all([listar<Bolsa>("bolsas"), listar<Candidatura>("candidaturas"), listar<Decisao>("decisoes")]);
  const activas = bolsas.filter((b) => b.estado !== "rascunho");
  const pendentes = activas.filter((b) => proximaAccao(b, t, f).urgente);
  const ajustes = [...decisoes].filter((d) => d.alterado).sort((a, b) => b.decididoEm.localeCompare(a.decididoEm)).slice(0, 5);
  const conta = (e: Candidatura["estado"]) => cands.filter((c) => c.estado === e).length;

  return (
    <>
      <Cabecalho titulo={k.painelT} subtitulo={k.painelD} />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Indicador rotulo={k.kSubmetidas} valor={cands.filter((c) => c.estado !== "rascunho").length} tom="primario" />
        <Indicador rotulo={k.kElegiveis} valor={conta("elegivel")} nota={k.aguardamCalculo} tom="info" />
        <Indicador rotulo={k.kPorDecidir} valor={conta("classificada")} nota={k.aguardamDecisao} tom="destaque" />
        <Indicador rotulo={k.kRejeitadas} valor={conta("rejeitada")} tom="perigo" />
        <Indicador rotulo={k.kAtribuidas} valor={cands.filter((c) => c.estado === "decidida" && c.resultadoFinal === "seleccionado").length} tom="sucesso" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <Cartao titulo={k.concursos} accoes={<Link href="/committee/scholarships" className="text-xs font-medium text-primary hover:underline">{t.comum.verTodas}</Link>} corpo="">
          {activas.length === 0 ? (
            <Vazio titulo={t.comum.semDados} />
          ) : (
            <ul className="divide-y divide-line">
              {activas.map((b) => {
                const a = proximaAccao(b, t, f);
                const n = cands.filter((c) => c.bolsaId === b.id && c.estado !== "rascunho").length;
                return (
                  <li key={b.id}>
                    <Link href={`/committee/scholarships/${b.id}`} className="group flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 hover:bg-surface-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-fg group-hover:text-primary">{b.titulo}</p>
                        <p className="mt-0.5 text-xs text-muted">
                          <span className={a.urgente ? "font-medium text-warning" : ""}>{a.texto}</span> · {fmt(k.candidaturasN, { n })} · {fmt(k.vagasN, { n: b.vagas })}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <Distintivo tom={TOM_ESTADO_BOLSA[b.estado]}>{t.estadoBolsa[b.estado]}</Distintivo>
                        <ChevronRight className="size-4 text-subtle group-hover:text-primary" />
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </Cartao>

        <div className="space-y-6">
          <Cartao titulo={k.pendentes} corpo="">
            {pendentes.length ? (
              <ul className="divide-y divide-line">
                {pendentes.map((b) => (
                  <li key={b.id}>
                    <Link href={`/committee/scholarships/${b.id}`} className="flex gap-3 px-5 py-3 hover:bg-surface-2">
                      <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-fg">{b.titulo}</p>
                        <p className="text-xs text-warning">{proximaAccao(b, t, f).texto}</p>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="px-5 py-4 text-sm text-muted">{k.semPendentes}</p>
            )}
          </Cartao>

          <Cartao titulo={k.ajustes} corpo="">
            {ajustes.length ? (
              <ul className="divide-y divide-line">
                {ajustes.map((d) => (
                  <li key={d.id} className="px-5 py-3">
                    <p className="text-sm font-medium text-fg">
                      {d.candidatoNome} <span className="font-mono text-[11px] font-normal text-subtle">{d.codigo}</span>
                    </p>
                    <p className="mt-0.5 text-xs text-muted">
                      {t.resultado[d.resultadoSistema]} → <span className="font-medium text-fg">{t.resultado[d.resultadoFinal]}</span>
                    </p>
                    <p className="mt-1 line-clamp-2 text-xs text-muted">{d.justificacao}</p>
                    <p className="mt-1 font-mono text-[11px] text-subtle">
                      {f.dataHora(d.decididoEm)} · {d.decididoPor}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="px-5 py-4 text-sm text-muted">{k.semAjustes}</p>
            )}
          </Cartao>
        </div>
      </div>
    </>
  );
}
