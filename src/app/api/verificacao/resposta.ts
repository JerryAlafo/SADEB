import { NextResponse } from "next/server";
import { fmt } from "@/lib/i18n";
import { obterI18n } from "@/lib/i18n/servidor";
import { ErroRegula } from "@/lib/regula";
import { ErroVerificacao } from "@/lib/verificacao";

/** Mesmo formato das outras APIs do SADEB: { success, message, data }. */
export function ok<T>(data: T, message = "OK") {
  return NextResponse.json({ success: true, message, data }, { headers: { "Cache-Control": "no-store" } });
}

export async function falha(e: unknown) {
  const { t } = await obterI18n();
  if (e instanceof ErroVerificacao) {
    return NextResponse.json({ success: false, code: e.chave, message: fmt(t.erros[e.chave], e.params), data: null }, { status: e.estado });
  }
  if (e instanceof ErroRegula) {
    console.error("[SADEB · regula]", e.message);
    return NextResponse.json({ success: false, code: e.chave, message: t.erros[e.chave], data: null }, { status: e.chave === "regulaNaoConfigurado" ? 503 : 502 });
  }
  console.error("[SADEB · verificação]", e);
  return NextResponse.json({ success: false, code: "erroLigacao", message: t.erros.erroLigacao, data: null }, { status: 500 });
}

export async function corpo(req: Request): Promise<Record<string, unknown>> {
  try {
    const j = await req.json();
    return j && typeof j === "object" ? j : {};
  } catch {
    return {};
  }
}
