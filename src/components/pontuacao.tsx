import type { Dicionario, Formatadores } from "@/lib/i18n";
import type { DetalheCriterio } from "@/lib/types";

/** Decomposição da pontuação por critério — transparência e rastreabilidade. */
export function DecomposicaoPontuacao({ detalhe, total, t, f }: { detalhe: DetalheCriterio[]; total: number; t: Dicionario; f: Formatadores }) {
  const p = t.pontuacao;
  const valor = (d: DetalheCriterio) =>
    typeof d.valor === "boolean" ? (d.valor ? t.comum.sim : t.comum.nao) : /rendimento|income/i.test(d.nome) ? f.mzn(d.valor) : f.numero(d.valor, Number.isInteger(d.valor) ? 0 : 1);
  return (
    <div className="overflow-x-auto">
      <table className="tabela">
        <thead>
          <tr>
            <th>{t.bolsa.colCriterio}</th>
            <th className="text-right">{p.colValor}</th>
            <th className="text-right">{p.colNormalizado}</th>
            <th className="text-right">{p.colPeso}</th>
            <th className="text-right">{p.colContributo}</th>
          </tr>
        </thead>
        <tbody>
          {detalhe.map((d) => (
            <tr key={d.criterioId}>
              <td className="font-medium">{d.nome}</td>
              <td className="text-right tabular-nums">{valor(d)}</td>
              <td className="text-right font-mono tabular-nums">{d.normalizado.toFixed(1)}</td>
              <td className="text-right font-mono tabular-nums">{d.peso}%</td>
              <td className="text-right font-mono font-medium tabular-nums">{d.contributo.toFixed(2)}</td>
            </tr>
          ))}
          <tr className="bg-surface-2">
            <td colSpan={4} className="text-right text-xs font-semibold tracking-wider text-muted uppercase">
              {p.final}
            </td>
            <td className="text-right font-mono text-base font-semibold text-primary tabular-nums">{total.toFixed(2)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
