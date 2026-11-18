import { ErroVerificacao, iniciar, publica, verificacaoActual } from "@/lib/verificacao";
import { falha, ok } from "./resposta";

/** GET /api/verificacao — estado da verificação de identidade deste browser. */
export async function GET() {
  try {
    const v = await verificacaoActual();
    if (!v) throw new ErroVerificacao("verificacaoInexistente", 404);
    return ok(publica(v));
  } catch (e) {
    return falha(e);
  }
}

/** POST /api/verificacao — inicia uma nova verificação (cookie httpOnly com o token). */
export async function POST() {
  try {
    return ok(publica(await iniciar()));
  } catch (e) {
    return falha(e);
  }
}
