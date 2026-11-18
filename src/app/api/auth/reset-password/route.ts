import { redefinirSenha } from "@/lib/autenticacao";
import { obterI18n } from "@/lib/i18n/servidor";
import { esperar } from "@/lib/latencia";
import { corpo, falha, ok } from "../resposta";

export async function POST(req: Request) {
  await esperar();
  try {
    const { token = "", nova_password = "" } = await corpo(req);
    const { t } = await obterI18n();
    await redefinirSenha(token, nova_password);
    return ok(null, t.auth.senhaActualizadaT);
  } catch (e) {
    return falha(e);
  }
}
