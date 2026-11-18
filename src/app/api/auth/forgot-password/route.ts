import type { NextRequest } from "next/server";
import { pedirRecuperacao } from "@/lib/autenticacao";
import { obterI18n } from "@/lib/i18n/servidor";
import { esperar } from "@/lib/latencia";
import { corpo, falha, ok } from "../resposta";

export async function POST(req: NextRequest) {
  await esperar();
  try {
    const { email = "" } = await corpo(req);
    const { t } = await obterI18n();
    await pedirRecuperacao(email, req.nextUrl.origin, t);
    return ok(null, t.auth.emailEnviadoD);
  } catch (e) {
    return falha(e);
  }
}
