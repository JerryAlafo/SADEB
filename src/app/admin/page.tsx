import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, Plus } from "lucide-react";
import { Cabecalho, Cartao, Distintivo, Indicador } from "@/components/ui";
import { listar } from "@/lib/db";
import { proximaAccao, TOM_ESTADO_BOLSA } from "@/lib/estilos";
import { fmt } from "@/lib/i18n";
import { obterI18n } from "@/lib/i18n/servidor";
import { textoAuditoria, textoPor } from "@/lib/textos";
import type { Bolsa, Candidatura, RegistoAuditoria, Utilizador } from "@/lib/types";
import { latenciaPagina } from "@/lib/latencia";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await obterI18n()).t.admin.painelT };
}

export default async function PainelAdmin() {
  await latenciaPagina();
  const { t, f } = await obterI18n();
  const a = t.admin;
  const [bolsas, users, cands, audit] = await Promise.all([listar<Bolsa>("bolsas"), listar<Utilizador>("utilizadores"), listar<Candidatura>("candidaturas"), listar<RegistoAuditoria>("auditoria")]);
  const recentes = [...audit].sort((x, y) => y.em.localeCompare(x.em)).slice(0, 8);

  return (
    <>
      <Cabecalho
        titulo={a.painelT}
        subtitulo={a.painelD}
        accoes={
          <Link href="/admin/scholarships/new" className="btn-primario">
            <Plus className="size-4" />
            {a.novo}
          </Link>
        }
      />
      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Indicador rotulo={a.kConcursos} valor={bolsas.length} nota={fmt(a.kAbertos, { n: bolsas.filter((b) => b.estado === "aberta").length })} tom="primario" />
        <Indicador rotulo={a.kCandidatos} valor={users.filter((u) => u.papel === "candidato").length} tom="info" />
        <Indicador rotulo={a.kComissao} valor={users.filter((u) => u.papel === "comissao").length} tom="destaque" />
        <Indicador rotulo={a.kCandidaturas} valor={cands.length} tom="sucesso" />
      </div>
      <div className="grid gap-6 xl:grid-cols-2">
        <Cartao titulo={a.kConcursos} accoes={<Link href="/admin/scholarships" className="text-xs font-medium text-primary hover:underline">{a.gerir}</Link>} corpo="">
          <ul className="divide-y divide-line">
            {bolsas.map((b) => (
              <li key={b.id}>
                <Link href={`/admin/scholarships/${b.id}`} className="group flex items-center justify-between gap-3 px-5 py-3.5 hover:bg-surface-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-fg group-hover:text-primary">{b.titulo}</p>
                    <p className="text-xs text-muted">{proximaAccao(b, t, f).texto}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Distintivo tom={TOM_ESTADO_BOLSA[b.estado]}>{t.estadoBolsa[b.estado]}</Distintivo>
                    <ChevronRight className="size-4 text-subtle" />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </Cartao>
        <Cartao titulo={a.actividade} accoes={<Link href="/admin/audit" className="text-xs font-medium text-primary hover:underline">{a.verAuditoria}</Link>} corpo="">
          <ul className="divide-y divide-line">
            {recentes.map((r) => (
              <li key={r.id} className="flex items-start justify-between gap-4 px-5 py-3">
                <div className="min-w-0">
                  <p className="text-sm text-fg">
                    {textoAuditoria(t, r)}
                    {r.alvo && <span className="text-muted"> — {r.alvo}</span>}
                  </p>
                  <p className="text-xs text-subtle">{textoPor(t, r.utilizador)}</p>
                </div>
                <span className="shrink-0 font-mono text-[11px] text-subtle">{f.dataHora(r.em)}</span>
              </li>
            ))}
          </ul>
        </Cartao>
      </div>
    </>
  );
}
