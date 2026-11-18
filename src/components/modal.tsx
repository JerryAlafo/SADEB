"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { AlertTriangle, CheckCircle2, Info, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "./i18n-provider";

export type TomModal = "primario" | "sucesso" | "perigo" | "aviso";

const ICONE = { primario: Info, sucesso: CheckCircle2, perigo: AlertTriangle, aviso: AlertTriangle };
const COR = {
  primario: "bg-primary-soft text-primary",
  sucesso: "bg-success-soft text-success",
  perigo: "bg-danger-soft text-danger",
  aviso: "bg-warning-soft text-warning",
};

/** Janela modal acessível (Esc fecha, foco no diálogo, scroll do fundo bloqueado). */
export function Modal({
  aberto,
  aoFechar,
  titulo,
  tom = "primario",
  children,
  rodape,
  largura = "max-w-md",
}: {
  aberto: boolean;
  aoFechar: () => void;
  titulo: ReactNode;
  tom?: TomModal;
  children?: ReactNode;
  rodape?: ReactNode;
  largura?: string;
}) {
  const { t } = useI18n();
  const id = useId();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!aberto) return;
    const anterior = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    ref.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && aoFechar();
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener("keydown", onKey);
      anterior?.focus?.();
    };
  }, [aberto, aoFechar]);

  if (!aberto) return null;
  const Icone = ICONE[tom];

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <button type="button" aria-label={t.comum.cancelar} onClick={aoFechar} className="absolute inset-0 bg-black/50 backdrop-blur-[1px]" />
      <div
        ref={ref}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby={id}
        className={cn("relative w-full rounded border border-line bg-surface shadow-2xl shadow-black/20 outline-none", largura)}
      >
        <div className="flex gap-4 px-6 pt-6 pb-5">
          <span className={cn("grid size-10 shrink-0 place-items-center rounded-sm", COR[tom])}>
            <Icone className="size-5" />
          </span>
          <div className="min-w-0 flex-1 pt-0.5">
            <h2 id={id} className="text-base font-semibold text-fg">
              {titulo}
            </h2>
            {children && <div className="mt-2 text-sm whitespace-pre-line text-muted">{children}</div>}
          </div>
          <button type="button" onClick={aoFechar} className="-mt-1 -mr-2 self-start rounded p-1.5 text-subtle hover:bg-surface-2 hover:text-fg" aria-label={t.comum.cancelar}>
            <X className="size-4" />
          </button>
        </div>
        {rodape && <div className="flex flex-wrap justify-end gap-2 border-t border-line bg-surface-2 px-6 py-3.5">{rodape}</div>}
      </div>
    </div>,
    document.body,
  );
}
