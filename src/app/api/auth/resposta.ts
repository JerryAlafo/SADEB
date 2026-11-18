import { NextResponse } from "next/server";
import { fmt } from "@/lib/i18n";
import { obterI18n } from "@/lib/i18n/servidor";
import { ErroAuth } from "@/lib/autenticacao";

/** Formato de resposta igual ao da API do backoffice: { success, message, data }. */
export function ok<T>(data: T, message = "OK") {
  return NextResponse.json({ success: true, message, data });
}

export async function falha(e: unknown) {
  const { t } = await obterI18n();
  if (e instanceof ErroAuth) {
    return NextResponse.json({ success: false, message: fmt(t.erros[e.chave], e.params), data: null }, { status: e.estado });
  }
  console.error("[SADEB · auth]", e);
  return NextResponse.json({ success: false, message: t.erros.erroLigacao, data: null }, { status: 500 });
}

export async function corpo(req: Request): Promise<Record<string, string>> {
  try {
    const j = await req.json();
    return j && typeof j === "object" ? j : {};
  } catch {
    return {};
  }
}
