import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { Cabecalho, Cartao, Distintivo } from "@/components/ui";
import { listar } from "@/lib/db";
import { TOM_ESTADO_BOLSA } from "@/lib/estilos";
import { obterI18n } from "@/lib/i18n/servidor";
import type { Bolsa, Candidatura } from "@/lib/types";
import { latenciaPagina } from "@/lib/latencia";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await obterI18n()).t.admin.concursosT };
}

export default async function AdminConcursos() {
  await latenciaPagina();
  const { t, f } = await obterI18n();
  const a = t.admin;
  const [bolsas, cands] = await Promise.all([listar<Bolsa>("bolsas"), listar<Candidatura>("candidaturas")]);
  return (
    <>
      <Cabecalho
        titulo={a.concursosT}
        accoes={
          <Link href="/admin/scholarships/new" className="btn-primario">
            <Plus className="size-4" />
            {a.novo}
          </Link>
        }
      />
      <Cartao corpo="">
        <div className="overflow-x-auto">
          <table className="tabela">
            <thead>
              <tr>
                <th>{a.colTitulo}</th>
                <th>{a.colPeriodo}</th>
                <th className="text-right">{t.bolsa.vagas}</th>
                <th className="text-right">{a.colCriterios}</th>
                <th className="text-right">{a.colCandidaturas}</th>
                <th>{t.comum.estado}</th>
              </tr>
            </thead>
            <tbody>
              {bolsas.map((b) => (
                <tr key={b.id}>
                  <td>
                    <Link href={`/admin/scholarships/${b.id}`} className="font-medium text-fg hover:text-primary">
                      {b.titulo}
                    </Link>
                    <p className="text-xs text-subtle">{b.entidade}</p>
                  </td>
                  <td className="whitespace-nowrap text-muted">
                    {f.data(b.dataAbertura)} – {f.data(b.dataEncerramento)}
                  </td>
                  <td className="text-right font-mono tabular-nums">{b.vagas}</td>
                  <td className="text-right font-mono tabular-nums">{b.criterios.length}</td>
                  <td className="text-right font-mono tabular-nums">{cands.filter((c) => c.bolsaId === b.id).length}</td>
                  <td>
                    <Distintivo tom={TOM_ESTADO_BOLSA[b.estado]}>{t.estadoBolsa[b.estado]}</Distintivo>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Cartao>
    </>
  );
}
