import { processarDocumentoCandidato } from "@/lib/verificacao";
import { corpo, falha, ok } from "../resposta";

export const maxDuration = 60;

/**
 * POST /api/verificacao/documento — OCR do documento de identificação (Regula Document Reader).
 * Corpo: { frente: base64 | data URI (jpeg/png/webp), verso?: base64 }
 */
export async function POST(req: Request) {
  try {
    const { frente, verso } = await corpo(req);
    return ok(await processarDocumentoCandidato(frente, verso));
  } catch (e) {
    return falha(e);
  }
}
