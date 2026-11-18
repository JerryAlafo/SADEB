import { cache } from "react";

/**
 * Tempo de espera aplicado a todos os pedidos (páginas, server actions e rotas /api),
 * para que os estados de carregamento sejam visíveis. Configurável com SADEB_LATENCIA_MS
 * (ex.: SADEB_LATENCIA_MS=0 para desligar).
 */
export const LATENCIA_MS = Math.max(0, Number(process.env.SADEB_LATENCIA_MS ?? 2000) || 0);

export function esperar(ms = LATENCIA_MS) {
  return ms > 0 ? new Promise<void>((r) => setTimeout(r, ms)) : Promise.resolve();
}

/** Uma única espera por pedido de renderização (várias chamadas partilham a mesma promessa). */
export const latenciaPagina = cache(() => esperar());
