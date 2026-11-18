import { cookies } from "next/headers";
import type { ReactNode } from "react";
import type { UtilizadorPublico } from "@/lib/auth";
import { listar } from "@/lib/db";
import { obterI18n } from "@/lib/i18n/servidor";
import type { Notificacao } from "@/lib/types";
import { Shell, type GrupoNav } from "./shell";

export async function Estrutura({ utilizador, children }: { utilizador: UtilizadorPublico; children: ReactNode }) {
  const { t } = await obterI18n();
  const naoLidas = (await listar<Notificacao>("notificacoes")).filter((n) => n.utilizadorId === utilizador.id && !n.lida).length;
  const n = t.nav;

  const grupos: Record<UtilizadorPublico["papel"], GrupoNav[]> = {
    candidato: [
      {
        titulo: n.principal,
        itens: [
          { href: "/applicant", rotulo: n.painel, icone: "painel", exacto: true },
          { href: "/applicant/scholarships", rotulo: n.concursos, icone: "concursos" },
          { href: "/applicant/applications", rotulo: n.candidaturas, icone: "candidaturas" },
        ],
      },
    ],
    comissao: [
      {
        titulo: n.principal,
        itens: [
          { href: "/committee", rotulo: n.painel, icone: "painel", exacto: true },
          { href: "/committee/scholarships", rotulo: n.avaliacao, icone: "avaliacao" },
          { href: "/committee/history", rotulo: n.historico, icone: "historico" },
        ],
      },
    ],
    admin: [
      {
        titulo: n.principal,
        itens: [{ href: "/admin", rotulo: n.painel, icone: "painel", exacto: true }],
      },
      {
        titulo: n.avaliacaoSeccao,
        itens: [
          { href: "/committee/scholarships", rotulo: n.avaliacao, icone: "avaliacao" },
          { href: "/committee/history", rotulo: n.historico, icone: "historico" },
        ],
      },
      {
        titulo: n.gestao,
        itens: [
          { href: "/admin/scholarships", rotulo: n.bolsas, icone: "bolsas" },
          { href: "/admin/users", rotulo: n.utilizadores, icone: "utilizadores" },
          { href: "/admin/audit", rotulo: n.auditoria, icone: "auditoria" },
        ],
      },
    ],
  };

  const portal = { candidato: n.portalCandidato, comissao: n.portalComissao, admin: n.portalAdmin }[utilizador.papel];

  return (
    <Shell
      portal={portal}
      grupos={grupos[utilizador.papel]}
      utilizador={{ nome: utilizador.nome, email: utilizador.email, papel: t.papel[utilizador.papel] }}
      naoLidas={naoLidas}
      recolhidoInicial={(await cookies()).get("sadeb_sidebar")?.value === "1"}
    >
      {children}
    </Shell>
  );
}
