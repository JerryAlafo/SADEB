"use client";

import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "./i18n-provider";
import { Emblema } from "./ui";

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn("size-4 animate-spin", className)} aria-hidden />;
}

/** Bloco de placeholder com brilho animado. */
function Osso({ className }: { className?: string }) {
  return <div className={cn("esqueleto rounded-sm", className)} />;
}

/** Barra de progresso indeterminada no topo da área de conteúdo. */
function BarraProgresso({ fixa = false }: { fixa?: boolean }) {
  return (
    <div className={cn("inset-x-0 top-0 z-40 h-0.5 overflow-hidden bg-primary/10", fixa ? "fixed" : "absolute")}>
      <div className="barra-progresso h-full w-1/3 bg-primary" />
    </div>
  );
}

/** Esqueleto da página enquanto carrega (usado nos loading.tsx dentro do shell). */
export function Carregamento() {
  const { t } = useI18n();
  return (
    <div role="status" aria-live="polite" aria-busy="true" className="relative">
      <span className="sr-only">{t.comum.carregando}</span>
      <BarraProgresso fixa />

      {/* cabeçalho */}
      <div className="mb-6 border-b border-line pb-5">
        <Osso className="mb-3 h-3 w-28" />
        <Osso className="h-6 w-72 max-w-full" />
        <Osso className="mt-2.5 h-3.5 w-[28rem] max-w-full" />
      </div>

      {/* indicadores */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="cartao relative overflow-hidden px-4 py-3.5">
            <span className="absolute inset-y-0 left-0 w-[3px] bg-line-strong" />
            <Osso className="h-2.5 w-24" />
            <Osso className="mt-3 h-6 w-14" />
          </div>
        ))}
      </div>

      {/* tabela + painel lateral */}
      <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <div className="cartao">
          <div className="flex h-12 items-center justify-between border-b border-line px-5">
            <Osso className="h-3.5 w-40" />
            <Osso className="h-3 w-16" />
          </div>
          <div className="flex h-10 items-center gap-6 border-b border-line bg-surface-2 px-4">
            {["w-16", "w-40", "w-20", "w-16"].map((w, i) => (
              <Osso key={i} className={cn("h-2.5", w)} />
            ))}
          </div>
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center gap-6 border-b border-line px-4 py-3.5 last:border-b-0" style={{ opacity: 1 - i * 0.12 }}>
              <Osso className="h-3 w-16" />
              <div className="flex-1 space-y-1.5">
                <Osso className="h-3 w-3/5" />
                <Osso className="h-2.5 w-2/5" />
              </div>
              <Osso className="hidden h-3 w-20 sm:block" />
              <Osso className="h-5 w-20" />
            </div>
          ))}
        </div>
        <div className="space-y-6">
          {[0, 1].map((c) => (
            <div key={c} className="cartao">
              <div className="flex h-12 items-center border-b border-line px-5">
                <Osso className="h-3.5 w-32" />
              </div>
              <div className="space-y-4 p-5">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="space-y-1.5">
                    <Osso className="h-3 w-4/5" />
                    <Osso className="h-2.5 w-1/2" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Carregamento em ecrã inteiro (páginas públicas): emblema + barra de progresso. */
export function CarregamentoEcra() {
  const { t } = useI18n();
  return (
    <div role="status" aria-live="polite" aria-busy="true" className="flex min-h-screen flex-col items-center justify-center gap-5 bg-bg">
      <BarraProgresso fixa />
      <Emblema className="size-12 animate-pulse" />
      <div className="text-center">
        <p className="text-sm font-semibold tracking-wide text-fg">{t.app.sigla}</p>
        <p className="mt-0.5 text-xs text-muted">{t.comum.carregando}</p>
      </div>
      <div className="h-0.5 w-40 overflow-hidden bg-line">
        <div className="barra-progresso h-full w-1/3 bg-primary" />
      </div>
    </div>
  );
}
