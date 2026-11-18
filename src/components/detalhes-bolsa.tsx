import { FileText } from "lucide-react";
import { fmt, type Dicionario, type Formatadores } from "@/lib/i18n";
import type { Bolsa } from "@/lib/types";
import { Cartao, ListaDados } from "./ui";

export function DetalhesBolsa({ bolsa, t, f }: { bolsa: Bolsa; t: Dicionario; f: Formatadores }) {
  const r = bolsa.requisitos;
  const b = t.bolsa;
  const regra = { maior_melhor: b.maior, menor_melhor: b.menor, booleano: b.booleano };
  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_1.3fr]">
      <div className="space-y-6">
        <Cartao titulo={b.requisitos}>
          <ListaDados
            itens={[
              [b.mediaMinima, fmt(t.comum.valores, { n: r.mediaMinima })],
              [b.rendMax, r.rendimentoPerCapitaMax > 0 ? fmt(b.porMes, { v: f.mzn(r.rendimentoPerCapitaMax) }) : b.semLimite],
              [b.idadeMax, r.idadeMaxima > 0 ? fmt(t.comum.anos, { n: r.idadeMaxima }) : b.semLimite],
              [b.areas, r.areasElegiveis.length ? r.areasElegiveis.join(", ") : b.todasAreas],
              [b.periodo, `${f.data(bolsa.dataAbertura)} – ${f.data(bolsa.dataEncerramento)}`],
              [b.vagas, fmt(b.vagasTxt, { v: bolsa.vagas, e: bolsa.vagasListaEspera })],
            ]}
          />
        </Cartao>
        <Cartao titulo={b.documentos} corpo="">
          <ul className="divide-y divide-line">
            {bolsa.documentosObrigatorios.map((d) => (
              <li key={d} className="flex items-center gap-3 px-5 py-2.5 text-sm">
                <FileText className="size-4 text-subtle" strokeWidth={1.75} />
                {d}
              </li>
            ))}
          </ul>
        </Cartao>
      </div>
      <Cartao titulo={b.criterios} descricao={b.criteriosD} corpo="">
        <div className="overflow-x-auto">
          <table className="tabela">
            <thead>
              <tr>
                <th>{b.colCriterio}</th>
                <th>{b.colRegra}</th>
                <th className="w-44 text-right">{b.colPeso}</th>
              </tr>
            </thead>
            <tbody>
              {bolsa.criterios.map((c) => (
                <tr key={c.id}>
                  <td>
                    <p className="font-medium">{c.nome}</p>
                    <p className="text-xs text-subtle">{t.campos[c.campo]}</p>
                  </td>
                  <td className="text-muted">
                    {regra[c.sentido]}
                    {c.sentido !== "booleano" && <span className="block font-mono text-xs text-subtle">{fmt(b.escala, { min: c.min, max: c.max })}</span>}
                  </td>
                  <td>
                    <div className="flex items-center justify-end gap-3">
                      <div className="h-1.5 w-20 bg-surface-2 ring-1 ring-line">
                        <div className="h-full bg-primary" style={{ width: `${c.peso}%` }} />
                      </div>
                      <span className="w-10 text-right font-mono font-medium tabular-nums">{c.peso}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Cartao>
    </div>
  );
}
