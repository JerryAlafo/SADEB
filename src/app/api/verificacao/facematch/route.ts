import { executarFacematch } from "@/lib/verificacao";
import { falha, ok } from "../resposta";

export const maxDuration = 60;

/** POST /api/verificacao/facematch — compara o retrato do documento com a selfie do liveness. */
export async function POST() {
  try {
    return ok(await executarFacematch());
  } catch (e) {
    return falha(e);
  }
}
