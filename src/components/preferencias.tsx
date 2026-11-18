"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Check, Globe, Moon, Sun } from "lucide-react";
import { definirIdioma } from "@/app/actions/preferencias";
import { COOKIE_TEMA, IDIOMAS } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { Spinner } from "./carregamento";
import { useI18n } from "./i18n-provider";

const BOTAO = "inline-flex h-9 items-center justify-center gap-1.5 rounded px-2 text-muted transition-colors hover:bg-surface-2 hover:text-fg focus-visible:outline-2 focus-visible:outline-primary";

export function AlternarTema({ className }: { className?: string }) {
  const { t } = useI18n();
  function alternar() {
    const novo = !document.documentElement.classList.contains("dark");
    document.documentElement.classList.toggle("dark", novo);
    document.cookie = `${COOKIE_TEMA}=${novo ? "dark" : "light"}; path=/; max-age=31536000; samesite=lax`;
  }
  // O ícone segue a classe .dark via CSS — sem estado nem flash na hidratação.
  return (
    <button type="button" onClick={alternar} className={cn(BOTAO, "w-9", className)} aria-label={t.comum.alternarTema} title={t.comum.alternarTema}>
      <Moon className="size-[18px] dark:hidden" />
      <Sun className="hidden size-[18px] dark:block" />
    </button>
  );
}

export function SeletorIdioma({ className }: { className?: string }) {
  const { idioma, t } = useI18n();
  const [aberto, setAberto] = useState(false);
  const [pendente, iniciar] = useTransition();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!aberto) return;
    const fora = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setAberto(false);
    document.addEventListener("mousedown", fora);
    return () => document.removeEventListener("mousedown", fora);
  }, [aberto]);

  return (
    <div ref={ref} className={cn("relative", className)}>
      <button type="button" onClick={() => setAberto((a) => !a)} className={cn(BOTAO, "px-2.5")} aria-label={t.comum.idioma} aria-expanded={aberto} disabled={pendente}>
        {pendente ? <Spinner className="size-[18px]" /> : <Globe className="size-[18px]" />}
        <span className="font-mono text-xs font-medium">{idioma.toUpperCase()}</span>
      </button>
      {aberto && (
        <ul className="absolute top-full right-0 z-50 mt-1 w-40 rounded-md border border-line bg-surface py-1 shadow-lg shadow-black/10">
          {IDIOMAS.map((i) => (
            <li key={i.codigo}>
              <button
                type="button"
                onClick={() => {
                  setAberto(false);
                  if (i.codigo !== idioma) iniciar(() => definirIdioma(i.codigo));
                }}
                className={cn("flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-surface-2", i.codigo === idioma ? "font-medium text-primary" : "text-fg")}
              >
                <span>
                  <span className="mr-2 font-mono text-xs text-subtle">{i.curto}</span>
                  {i.rotulo}
                </span>
                {i.codigo === idioma && <Check className="size-3.5" />}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
