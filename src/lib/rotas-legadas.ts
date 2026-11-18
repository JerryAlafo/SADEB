// Rotas antigas (em português) → rotas actuais (em inglês).
// Usado pelos redirecionamentos do next.config.ts e para corrigir links já guardados nos dados.
// A ordem importa: prefixos mais específicos primeiro.
export const ROTAS_LEGADAS: [antiga: string, nova: string][] = [
  ["/candidato/candidaturas", "/applicant/applications"],
  ["/candidato/bolsas", "/applicant/scholarships"],
  ["/candidato", "/applicant"],
  ["/comissao/bolsas", "/committee/scholarships"],
  ["/comissao/candidaturas", "/committee/applications"],
  ["/comissao/historico", "/committee/history"],
  ["/comissao", "/committee"],
  ["/admin/bolsas/nova", "/admin/scholarships/new"],
  ["/admin/bolsas", "/admin/scholarships"],
  ["/admin/utilizadores", "/admin/users"],
  ["/admin/auditoria", "/admin/audit"],
  ["/bolsas", "/scholarships"],
  ["/entrar", "/auth"],
  ["/registar", "/register"],
  ["/recuperar-senha", "/forgot-password"],
  ["/redefinir-senha", "/reset-password"],
  ["/acesso-negado", "/access-denied"],
  ["/perfil", "/profile"],
  ["/notificacoes", "/notifications"],
  ["/api/documentos", "/api/documents"],
  ["/api/relatorios", "/api/reports"],
];

/** Converte um link guardado com uma rota antiga para a rota actual. */
export function actualizarLink(link: string | undefined) {
  if (!link) return link;
  for (const [antiga, nova] of ROTAS_LEGADAS) {
    if (link === antiga || link.startsWith(`${antiga}/`) || link.startsWith(`${antiga}?`)) return nova + link.slice(antiga.length);
  }
  return link;
}
