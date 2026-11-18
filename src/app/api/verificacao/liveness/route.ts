import { confirmarLiveness } from "@/lib/verificacao";
import { corpo, falha, ok } from "../resposta";

export const maxDuration = 60;

/**
 * POST /api/verificacao/liveness — confirma no servidor a prova de vida feita no browser.
 * Corpo: { transactionId } (devolvido pelo componente <face-liveness>).
 * O resultado é sempre obtido da Face API; o que o browser diz sobre o resultado é ignorado.
 */
export async function POST(req: Request) {
  try {
    const { transactionId } = await corpo(req);
    const { verificacao } = await confirmarLiveness(transactionId);
    return ok(verificacao);
  } catch (e) {
    return falha(e);
  }
}
