import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { TOM_ESTADO_CAND, TOM_RESULTADO } from "@/lib/estilos";
import type { Dicionario, Formatadores } from "@/lib/i18n";
import type { Bolsa, Candidatura } from "@/lib/types";
import { Distintivo } from "./ui";

export function EstadoCandidatura({ c, t }: { c: Candidatura; t: Dicionario }) {
  if (c.estado === "decidida" && c.resultadoFinal)
    return (
      <Distintivo tom={TOM_RESULTADO[c.resultadoFinal]}>
        {t.resultado[c.resultadoFinal]}
      </Distintivo>
    );
  return (
    <Distintivo tom={TOM_ESTADO_CAND[c.estado]}>
      {t.estadoCand[c.estado]}
    </Distintivo>
  );
}

export function TabelaCandidaturasCandidato({
  candidaturas,
  bolsas,
  t,
  f,
}: {
  candidaturas: Candidatura[];
  bolsas: Bolsa[];
  t: Dicionario;
  f: Formatadores;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="tabela">
        <thead>
          <tr>
            <th>{t.candidato.colCodigo}</th>
            <th>{t.candidato.colConcurso}</th>
            <th>{t.candidato.colSubmissao}</th>
            <th>{t.comum.estado}</th>
            <th className="w-10" />
          </tr>
        </thead>
        <tbody>
          {candidaturas.map((c) => (
            <tr key={c.id} className="group">
              <td className="font-mono text-xs whitespace-nowrap text-muted">
                {c.codigo}
              </td>
              <td>
                <Link
                  href={`/applicant/applications/${c.id}`}
                  className="font-medium text-fg group-hover:text-primary"
                >
                  {bolsas.find((b) => b.id === c.bolsaId)?.titulo ?? "—"}
                </Link>
              </td>
              <td className="whitespace-nowrap text-muted">
                {c.submetidaEm
                  ? f.data(c.submetidaEm)
                  : t.candidato.naoSubmetida}
              </td>
              <td>
                <EstadoCandidatura c={c} t={t} />
              </td>
              <td>
                <Link
                  href={`/applicant/applications/${c.id}`}
                  aria-label={t.comum.abrir}
                  className="text-subtle group-hover:text-primary"
                >
                  <ChevronRight className="size-4" />
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
