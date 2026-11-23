import { login } from "@/lib/autenticacao";
import { esperar } from "@/lib/latencia";
import { ipDoPedido, validarTurnstile } from "@/lib/turnstile";
import { corpo, falha, ok } from "../resposta";

export async function POST(req: Request) {
  await esperar();
  try {
    const { email = "", password = "", redirect, turnstileToken } = await corpo(req);
    await validarTurnstile(turnstileToken, ipDoPedido(req));
    return ok(await login(email, password, redirect));
  } catch (e) {
    return falha(e);
  }
}
