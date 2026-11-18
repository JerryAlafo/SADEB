import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { randomBytes } from "node:crypto";
import { agora, inserir, listar, remover } from "./db";
import type { Papel, Sessao, Utilizador } from "./types";

const COOKIE = "sadeb_sessao";
const DURACAO_HORAS = 12; // igual ao backoffice (maxAge 12 h)

export type UtilizadorPublico = Omit<Utilizador, "passwordHash">;

function publico(u: Utilizador): UtilizadorPublico {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { passwordHash, ...resto } = u;
  return resto;
}

export async function criarSessao(utilizadorId: string) {
  const token = randomBytes(32).toString("hex");
  const expira = new Date(Date.now() + DURACAO_HORAS * 3600 * 1000);
  await inserir<Sessao>("sessoes", {
    token,
    utilizadorId,
    expiraEm: expira.toISOString(),
    criadaEm: agora(),
  });
  const store = await cookies();
  store.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expira,
  });
}

export async function terminarSessao() {
  const store = await cookies();
  const token = store.get(COOKIE)?.value;
  if (token) {
    const agoraMs = Date.now();
    // remove a sessão actual e aproveita para limpar sessões expiradas
    await remover("sessoes", (s) => s.token === token || new Date(String(s.expiraEm)).getTime() < agoraMs);
  }
  store.delete(COOKIE);
}

/** Utilizador autenticado no pedido actual (memorizado por pedido). */
export const utilizadorActual = cache(async (): Promise<UtilizadorPublico | null> => {
  const store = await cookies();
  const token = store.get(COOKIE)?.value;
  if (!token) return null;
  const sessao = (await listar<Sessao>("sessoes")).find((s) => s.token === token);
  if (!sessao || new Date(sessao.expiraEm).getTime() < Date.now()) return null;
  const u = (await listar<Utilizador>("utilizadores")).find((x) => x.id === sessao.utilizadorId);
  if (!u || !u.activo) return null;
  return publico(u);
});

export function painelDe(papel: Papel) {
  return papel === "candidato" ? "/applicant" : papel === "admin" ? "/admin" : "/committee";
}

/** Garante sessão e (opcionalmente) um dos papéis indicados. */
export async function exigirUtilizador(...papeis: Papel[]): Promise<UtilizadorPublico> {
  const u = await utilizadorActual();
  if (!u) redirect("/auth");
  if (papeis.length && !papeis.includes(u.papel)) redirect(painelDe(u.papel));
  return u;
}
