import { configuracaoPublica } from "@/lib/regula";
import { VERIFICACAO_OBRIGATORIA } from "@/lib/verificacao";
import { ok } from "../resposta";

/** GET /api/verificacao/config — o que o browser precisa para o componente de liveness. */
export async function GET() {
  return ok({ ...configuracaoPublica(), obrigatoria: VERIFICACAO_OBRIGATORIA });
}
