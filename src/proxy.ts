// ─────────────────────────────────────────────────────────────
// SADEB — proxy.ts  (equivalente ao middleware.ts)
//
// No Next.js 16 o ficheiro "middleware.ts" foi renomeado para "proxy.ts"
// (mesma função). Tem de ficar ao lado da pasta app/ — neste projecto, em src/.
//
// Corre ANTES de cada pedido e gere o acesso às telas autenticadas:
//
//   Rota pedida                         Sem sessão            Perfil sem permissão
//   ──────────────────────────────────  ────────────────────  ─────────────────────
//   /applicant/**      (candidato)      → /auth?redirect=…    → /access-denied (403)
//   /committee/**      (comissão, admin)→ /auth?redirect=…    → /access-denied (403)
//   /admin/**          (admin)          → /auth?redirect=…    → /access-denied (403)
//   /profile, /notifications (todos)    → /auth?redirect=…    —
//   /api/documents/**  (todos)          → 401 JSON            —
//   /api/reports       (comissão, admin)→ 401 JSON            → 403 JSON
//
//   /auth, /register, /forgot-password, /reset-password: só para anónimos —
//   com sessão activa redirecciona para o painel do perfil.
//
// Sessão inválida/expirada → o cookie é removido.
// As páginas, server actions e rotas /api voltam a validar (defesa em profundidade).
// ─────────────────────────────────────────────────────────────
import { NextResponse, type NextRequest } from "next/server";
import { listar } from "@/lib/db";
import type { Papel, Sessao, Utilizador } from "@/lib/types";

const COOKIE_SESSAO = "sadeb_sessao";

/** Prefixo de rota → perfis autorizados (lista vazia = qualquer utilizador autenticado). */
const ROTAS_PROTEGIDAS: [string, Papel[]][] = [
  ["/applicant", ["candidato"]],
  ["/committee", ["comissao", "admin"]],
  ["/admin", ["admin"]],
  ["/profile", []],
  ["/notifications", []],
  ["/api/documents", []],
  ["/api/reports", ["comissao", "admin"]],
];

/** Páginas só para utilizadores sem sessão. */
const ROTAS_ANONIMAS = ["/auth", "/register", "/forgot-password", "/reset-password"];

/** Painel inicial de cada perfil. */
const PAINEL: Record<Papel, string> = { candidato: "/applicant", comissao: "/committee", admin: "/admin" };

function corresponde(path: string, prefixo: string) {
  return path === prefixo || path.startsWith(`${prefixo}/`);
}

async function perfilDaSessao(token: string | undefined): Promise<Papel | null> {
  if (!token) return null;
  const sessao = (await listar<Sessao>("sessoes")).find((s) => s.token === token);
  if (!sessao || new Date(sessao.expiraEm).getTime() < Date.now()) return null;
  const u = (await listar<Utilizador>("utilizadores")).find((x) => x.id === sessao.utilizadorId);
  return u?.activo ? u.papel : null;
}

export async function proxy(req: NextRequest) {
  const path = req.nextUrl.pathname;
  const token = req.cookies.get(COOKIE_SESSAO)?.value;
  const regra = ROTAS_PROTEGIDAS.find(([prefixo]) => corresponde(path, prefixo));
  const anonima = ROTAS_ANONIMAS.some((p) => corresponde(path, p));

  // Rota pública (início, /scholarships/…, /access-denied, /api/auth/…)
  if (!regra && !anonima) return NextResponse.next();

  const perfil = await perfilDaSessao(token);
  const api = path.startsWith("/api/");

  // Login/registo com sessão activa → painel
  if (anonima) return perfil ? NextResponse.redirect(new URL(PAINEL[perfil], req.url)) : NextResponse.next();

  // Sem sessão → login (ou 401 nas APIs)
  if (!perfil) {
    const res = api
      ? NextResponse.json({ success: false, message: "Unauthorized", data: null }, { status: 401 })
      : NextResponse.redirect(new URL(`/auth?redirect=${encodeURIComponent(path + req.nextUrl.search)}`, req.url));
    if (token) res.cookies.delete(COOKIE_SESSAO); // sessão inválida ou expirada
    return res;
  }

  // Perfil sem permissão → 403
  const [, permitidos] = regra!;
  if (permitidos.length && !permitidos.includes(perfil)) {
    return api
      ? NextResponse.json({ success: false, message: "Forbidden", data: null }, { status: 403 })
      : NextResponse.rewrite(new URL("/access-denied", req.url), { status: 403 });
  }

  return NextResponse.next();
}

export const config = {
  // Todas as rotas excepto ficheiros estáticos e a API de autenticação
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|woff2?|webmanifest)$).*)"],
};
