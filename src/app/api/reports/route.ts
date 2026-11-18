import type { NextRequest } from "next/server";
import { utilizadorActual } from "@/lib/auth";
import { listar } from "@/lib/db";
import { obterI18n } from "@/lib/i18n/servidor";
import { textoMotivo, textoPor } from "@/lib/textos";
import type { Bolsa, Decisao } from "@/lib/types";
import { esperar } from "@/lib/latencia";

function celula(v: unknown) {
  const s = v === null || v === undefined ? "" : String(v);
  return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** Exporta o histórico de decisões em CSV (separador ";" — abre directamente no Excel). */
export async function GET(req: NextRequest) {
  await esperar();
  const u = await utilizadorActual();
  if (!u || u.papel === "candidato") return new Response("Forbidden", { status: 403 });
  const { t, f, idioma } = await obterI18n();
  const k = t.comissao;

  const filtro = req.nextUrl.searchParams.get("bolsa");
  const [bolsas, decisoes] = await Promise.all([listar<Bolsa>("bolsas"), listar<Decisao>("decisoes")]);
  const titulo = (id: string) => bolsas.find((b) => b.id === id)?.titulo ?? "";

  const cab = [k.colConcurso, t.candidato.colCodigo, k.colCandidato, "#", k.colPontuacao, k.colSistema, k.colFinal, k.ajustado, k.colJustificacao, k.colRegisto, t.comum.data];
  const linhas = decisoes
    .filter((d) => !filtro || d.bolsaId === filtro)
    .sort((a, b) => a.bolsaId.localeCompare(b.bolsaId) || (a.posicao ?? 9999) - (b.posicao ?? 9999))
    .map((d) => [
      titulo(d.bolsaId),
      d.codigo,
      d.candidatoNome,
      d.posicao ?? "",
      d.pontuacao === null ? "" : f.numero(d.pontuacao, 2),
      t.resultado[d.resultadoSistema],
      t.resultado[d.resultadoFinal],
      d.alterado ? t.comum.sim : t.comum.nao,
      d.justificacao ?? d.motivos?.map((m) => textoMotivo(t, m)).join(" ") ?? "",
      textoPor(t, d.decididoPor),
      f.dataHora(d.decididoEm),
    ]);

  const csv = "﻿" + [cab, ...linhas].map((l) => l.map(celula).join(";")).join("\r\n");
  const nome = idioma === "en" ? "sadeb-decisions" : "sadeb-decisoes";
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${nome}-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
