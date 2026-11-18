import path from "node:path";
import { utilizadorActual } from "@/lib/auth";
import { lerUpload, listar } from "@/lib/db";
import type { Candidatura } from "@/lib/types";
import { esperar } from "@/lib/latencia";

const TIPOS: Record<string, string> = {
  ".pdf": "application/pdf",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".txt": "text/plain; charset=utf-8",
  ".doc": "application/msword",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
};

export async function GET(_: Request, ctx: RouteContext<"/api/documents/[id]">) {
  await esperar();
  const { id } = await ctx.params;
  const u = await utilizadorActual();
  if (!u) return new Response("Não autenticado", { status: 401 });

  const cand = (await listar<Candidatura>("candidaturas")).find((c) => c.documentos.some((d) => d.id === id));
  const doc = cand?.documentos.find((d) => d.id === id);
  if (!cand || !doc) return new Response("Documento não encontrado", { status: 404 });
  if (u.papel === "candidato" && cand.utilizadorId !== u.id) return new Response("Sem permissão", { status: 403 });

  try {
    const dados = await lerUpload(doc.ficheiro);
    if (!dados) return new Response("Ficheiro em falta no armazenamento", { status: 404 });
    const ext = path.extname(doc.ficheiro).toLowerCase();
    return new Response(new Uint8Array(dados), {
      headers: {
        "Content-Type": TIPOS[ext] ?? "application/octet-stream",
        "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(doc.nomeOriginal)}`,
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "private, no-store",
      },
    });
  } catch {
    return new Response("Ficheiro em falta no armazenamento", { status: 404 });
  }
}
