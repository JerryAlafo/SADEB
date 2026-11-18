import { Check, X } from "lucide-react";
import type { Dicionario, Formatadores } from "@/lib/i18n";
import { textoEvento, textoPor } from "@/lib/textos";
import type { Candidatura } from "@/lib/types";
import { cn } from "@/lib/utils";

function situacao(c: Candidatura): { fase: number; erro?: boolean; concluido?: boolean } {
  switch (c.estado) {
    case "rascunho":
      return { fase: 1 };
    case "correcao_solicitada":
      return { fase: 1, erro: true };
    case "rejeitada":
      return c.motivos?.some((m) => m.chave === "foraDoPrazo") ? { fase: 1, erro: true } : { fase: 2, erro: true };
    case "elegivel":
      return { fase: 3 };
    case "classificada":
      return { fase: 4 };
    case "decidida":
      return { fase: 5, concluido: true };
  }
}

/** Indicador de progresso pelas 5 fases do fluxograma. */
export function FluxoCandidatura({ candidatura, t }: { candidatura: Candidatura; t: Dicionario }) {
  const s = situacao(candidatura);
  const fases = [t.fases.f1, t.fases.f2, t.fases.f3, t.fases.f4, t.fases.f5];
  return (
    <ol className="cartao grid divide-y divide-line sm:grid-cols-5 sm:divide-x sm:divide-y-0">
      {fases.map((f, i) => {
        const n = i + 1;
        const feito = n < s.fase || (s.concluido && n === s.fase);
        const actual = n === s.fase && !s.concluido;
        return (
          <li key={n} className={cn("relative px-4 py-3.5", actual && (s.erro ? "bg-danger-soft" : "bg-primary-soft"))}>
            <span className={cn("absolute inset-x-0 top-0 h-[3px]", feito ? "bg-success" : actual ? (s.erro ? "bg-danger" : "bg-primary") : "bg-transparent")} />
            <div className="flex items-center gap-2.5">
              <span
                className={cn(
                  "grid size-6 shrink-0 place-items-center rounded-sm font-mono text-xs font-semibold",
                  feito ? "bg-success text-white dark:text-bg" : actual ? (s.erro ? "bg-danger text-white dark:text-bg" : "bg-primary text-primary-fg") : "border border-line-strong text-subtle",
                )}
              >
                {feito ? <Check className="size-3.5" strokeWidth={3} /> : actual && s.erro ? <X className="size-3.5" strokeWidth={3} /> : n}
              </span>
              <span className={cn("text-sm font-semibold", feito || actual ? "text-fg" : "text-muted")}>{f.t}</span>
            </div>
            <p className="mt-1.5 text-xs leading-snug text-muted">{f.d}</p>
          </li>
        );
      })}
    </ol>
  );
}

export function Historico({ eventos, t, f }: { eventos: Candidatura["historico"]; t: Dicionario; f: Formatadores }) {
  return (
    <ol className="relative space-y-5 border-l border-line pl-5">
      {[...eventos].reverse().map((e, i) => {
        const { titulo, detalhe } = textoEvento(t, e);
        const sistema = e.por === "Sistema";
        return (
          <li key={i} className="relative">
            <span className={cn("absolute top-1 -left-[24.5px] size-2 ring-4 ring-surface", sistema ? "bg-accent" : "bg-primary")} />
            <p className="text-sm font-medium text-fg">{titulo}</p>
            {detalhe && <p className="mt-0.5 text-sm text-muted">{detalhe}</p>}
            <p className="mt-1 font-mono text-[11px] text-subtle">
              {f.dataHora(e.em)} · {textoPor(t, e.por)}
            </p>
          </li>
        );
      })}
    </ol>
  );
}
