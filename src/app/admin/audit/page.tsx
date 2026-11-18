import type { Metadata } from "next";
import { Cabecalho, Cartao } from "@/components/ui";
import { listar } from "@/lib/db";
import { obterI18n } from "@/lib/i18n/servidor";
import { textoAuditoria, textoPor } from "@/lib/textos";
import type { RegistoAuditoria } from "@/lib/types";
import { latenciaPagina } from "@/lib/latencia";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await obterI18n()).t.admin.auditoriaT };
}

export default async function Auditoria() {
  await latenciaPagina();
  const { t, f } = await obterI18n();
  const a = t.admin;
  const regs = (await listar<RegistoAuditoria>("auditoria")).sort((x, y) => y.em.localeCompare(x.em)).slice(0, 500);
  return (
    <>
      <Cabecalho titulo={a.auditoriaT} subtitulo={a.auditoriaD} />
      <Cartao corpo="">
        <div className="overflow-x-auto">
          <table className="tabela">
            <thead>
              <tr>
                <th>{t.comum.data}</th>
                <th>{a.colUtilizador}</th>
                <th>{a.colAccao}</th>
                <th>{a.colAlvo}</th>
                <th>{a.colDetalhe}</th>
              </tr>
            </thead>
            <tbody>
              {regs.map((r) => (
                <tr key={r.id}>
                  <td className="font-mono text-[11px] whitespace-nowrap text-subtle">{f.dataHora(r.em)}</td>
                  <td className="whitespace-nowrap">{textoPor(t, r.utilizador)}</td>
                  <td className="font-medium">{textoAuditoria(t, r)}</td>
                  <td className="text-muted">{r.alvo ?? "—"}</td>
                  <td className="max-w-md text-xs text-muted">{r.detalhe ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Cartao>
    </>
  );
}
