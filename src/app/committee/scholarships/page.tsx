import type { Metadata } from "next";
import Link from "next/link";
import { Cabecalho, Cartao, Distintivo, Vazio } from "@/components/ui";
import { listar } from "@/lib/db";
import { proximaAccao, TOM_ESTADO_BOLSA } from "@/lib/estilos";
import { obterI18n } from "@/lib/i18n/servidor";
import type { Bolsa, Candidatura } from "@/lib/types";
import { cn } from "@/lib/utils";
import { latenciaPagina } from "@/lib/latencia";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await obterI18n()).t.comissao.avaliacaoT };
}

export default async function ConcursosComissao() {
  await latenciaPagina();
  const { t, f } = await obterI18n();
  const k = t.comissao;
  const [bolsas, cands] = await Promise.all([listar<Bolsa>("bolsas"), listar<Candidatura>("candidaturas")]);
  const lista = bolsas.filter((b) => b.estado !== "rascunho").sort((a, b) => b.dataEncerramento.localeCompare(a.dataEncerramento));

  return (
    <>
      <Cabecalho titulo={k.avaliacaoT} subtitulo={k.avaliacaoD} />
      <Cartao corpo="">
        {lista.length === 0 ? (
          <Vazio titulo={t.comum.semDados} />
        ) : (
          <div className="overflow-x-auto">
            <table className="tabela">
              <thead>
                <tr>
                  <th>{k.colConcurso}</th>
                  <th>{t.admin.colPeriodo}</th>
                  <th className="text-right">{t.bolsa.vagas}</th>
                  <th className="text-right">{k.colSubmetidas}</th>
                  <th className="text-right">{k.colElegiveis}</th>
                  <th>{t.comum.estado}</th>
                  <th>{k.colProximo}</th>
                </tr>
              </thead>
              <tbody>
                {lista.map((b) => {
                  const cs = cands.filter((c) => c.bolsaId === b.id);
                  const a = proximaAccao(b, t, f);
                  return (
                    <tr key={b.id}>
                      <td>
                        <Link href={`/committee/scholarships/${b.id}`} className="font-medium text-fg hover:text-primary">
                          {b.titulo}
                        </Link>
                      </td>
                      <td className="whitespace-nowrap text-muted">
                        {f.data(b.dataAbertura)} – {f.data(b.dataEncerramento)}
                      </td>
                      <td className="text-right font-mono tabular-nums">{b.vagas}</td>
                      <td className="text-right font-mono tabular-nums">{cs.filter((c) => c.estado !== "rascunho").length}</td>
                      <td className="text-right font-mono tabular-nums">{cs.filter((c) => ["elegivel", "classificada", "decidida"].includes(c.estado)).length}</td>
                      <td>
                        <Distintivo tom={TOM_ESTADO_BOLSA[b.estado]}>{t.estadoBolsa[b.estado]}</Distintivo>
                      </td>
                      <td className={cn("text-xs", a.urgente ? "font-medium text-warning" : "text-muted")}>{a.texto}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Cartao>
    </>
  );
}
