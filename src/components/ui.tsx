import Link from "next/link";
import type { ReactNode } from "react";
import { AlertTriangle, CheckCircle2, ChevronLeft, Info, Inbox, XCircle } from "lucide-react";
import type { Tom } from "@/lib/estilos";
import { cn } from "@/lib/utils";

/** Emblema institucional: rosa-dos-ventos estilizada. */
export function Emblema({ className = "size-9" }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden>
      <rect width="40" height="40" rx="3" className="fill-primary" />
      <path d="M20 6 23 17 34 20 23 23 20 34 17 23 6 20 17 17Z" className="fill-primary-fg" opacity=".95" />
      <path d="M20 6 23 17 20 20Z M34 20 23 23 20 20Z M20 34 17 23 20 20Z M6 20 17 17 20 20Z" className="fill-primary" opacity=".35" />
      <circle cx="20" cy="20" r="2.2" className="fill-accent" />
    </svg>
  );
}

const TONS: Record<Tom, { badge: string; dot: string; barra: string; texto: string }> = {
  neutro: { badge: "bg-surface-2 text-muted border-line", dot: "bg-subtle", barra: "bg-line-strong", texto: "text-fg" },
  primario: { badge: "bg-primary-soft text-primary border-primary/25", dot: "bg-primary", barra: "bg-primary", texto: "text-primary" },
  sucesso: { badge: "bg-success-soft text-success border-success/25", dot: "bg-success", barra: "bg-success", texto: "text-success" },
  aviso: { badge: "bg-warning-soft text-warning border-warning/25", dot: "bg-warning", barra: "bg-warning", texto: "text-warning" },
  perigo: { badge: "bg-danger-soft text-danger border-danger/25", dot: "bg-danger", barra: "bg-danger", texto: "text-danger" },
  info: { badge: "bg-info-soft text-info border-info/25", dot: "bg-info", barra: "bg-info", texto: "text-info" },
  destaque: { badge: "bg-accent-soft text-accent border-accent/30", dot: "bg-accent", barra: "bg-accent", texto: "text-accent" },
};

export function Distintivo({ tom = "neutro", children, className }: { tom?: Tom; children: ReactNode; className?: string }) {
  return (
    <span className={cn("inline-flex h-6 items-center gap-1.5 rounded-sm border px-2 text-xs font-medium whitespace-nowrap", TONS[tom].badge, className)}>
      <span className={cn("size-1.5 rounded-full", TONS[tom].dot)} />
      {children}
    </span>
  );
}

export function Cabecalho({
  titulo,
  subtitulo,
  accoes,
  voltar,
  sobretitulo,
}: {
  titulo: ReactNode;
  subtitulo?: ReactNode;
  accoes?: ReactNode;
  voltar?: { href: string; rotulo: string };
  sobretitulo?: ReactNode;
}) {
  return (
    <div className="mb-6 border-b border-line pb-5">
      {voltar && (
        <Link href={voltar.href} className="mb-3 inline-flex items-center gap-1 text-xs font-medium text-muted hover:text-primary">
          <ChevronLeft className="size-3.5" />
          {voltar.rotulo}
        </Link>
      )}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          {sobretitulo && <p className="mb-1 font-mono text-xs tracking-wide text-subtle uppercase">{sobretitulo}</p>}
          <h1 className="text-[22px] leading-tight font-semibold tracking-tight text-fg">{titulo}</h1>
          {subtitulo && <p className="mt-1.5 max-w-3xl text-sm text-muted">{subtitulo}</p>}
        </div>
        {accoes && <div className="flex flex-wrap items-center gap-2">{accoes}</div>}
      </div>
    </div>
  );
}

export function Cartao({
  titulo,
  descricao,
  accoes,
  children,
  className,
  corpo = "p-5",
}: {
  titulo?: ReactNode;
  descricao?: ReactNode;
  accoes?: ReactNode;
  children: ReactNode;
  className?: string;
  corpo?: string;
}) {
  return (
    <section className={cn("cartao", className)}>
      {(titulo || accoes) && (
        <header className="flex min-h-12 flex-wrap items-center justify-between gap-2 border-b border-line px-5 py-3">
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-fg">{titulo}</h2>
            {descricao && <p className="mt-0.5 text-xs text-muted">{descricao}</p>}
          </div>
          {accoes}
        </header>
      )}
      <div className={corpo}>{children}</div>
    </section>
  );
}

export function Indicador({ rotulo, valor, nota, tom = "primario" }: { rotulo: string; valor: ReactNode; nota?: ReactNode; tom?: Tom }) {
  return (
    <div className="cartao relative overflow-hidden px-4 py-3.5">
      <span className={cn("absolute inset-y-0 left-0 w-[3px]", TONS[tom].barra)} />
      <p className="text-[11px] font-semibold tracking-wider text-muted uppercase">{rotulo}</p>
      <p className="mt-1.5 text-2xl font-semibold text-fg tabular-nums">{valor}</p>
      {nota && <p className="mt-0.5 text-xs text-subtle">{nota}</p>}
    </div>
  );
}

export function Vazio({ titulo, children }: { titulo: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center px-6 py-12 text-center">
      <Inbox className="mb-3 size-8 text-subtle" strokeWidth={1.5} />
      <p className="text-sm font-medium text-fg">{titulo}</p>
      {children && <div className="mt-1 max-w-md text-sm text-muted">{children}</div>}
    </div>
  );
}

const ICONE_AVISO = { info: Info, sucesso: CheckCircle2, aviso: AlertTriangle, erro: XCircle };
const TOM_AVISO = { info: "info", sucesso: "sucesso", aviso: "aviso", erro: "perigo" } as const;

export function Aviso({
  tom = "info",
  titulo,
  children,
  accao,
}: {
  tom?: "info" | "sucesso" | "aviso" | "erro";
  titulo?: ReactNode;
  children?: ReactNode;
  accao?: ReactNode;
}) {
  const Icone = ICONE_AVISO[tom];
  const c = TONS[TOM_AVISO[tom]];
  return (
    <div className={cn("flex gap-3 rounded border border-l-[3px] px-4 py-3 text-sm", c.badge)}>
      <Icone className="mt-0.5 size-4 shrink-0" />
      <div className="min-w-0 flex-1">
        {titulo && <p className="font-semibold">{titulo}</p>}
        {children && <div className={cn("text-fg/80", titulo && "mt-0.5")}>{children}</div>}
      </div>
      {accao && <div className="shrink-0 self-center">{accao}</div>}
    </div>
  );
}

export function BarraPontuacao({ valor }: { valor: number }) {
  return (
    <div className="flex items-center gap-3">
      <div className="h-1.5 w-24 bg-surface-2 ring-1 ring-line">
        <div className="h-full bg-primary" style={{ width: `${Math.max(0, Math.min(100, valor))}%` }} />
      </div>
      <span className="font-mono text-sm font-medium tabular-nums">{valor.toFixed(2)}</span>
    </div>
  );
}

/** Lista de pares rótulo/valor. */
export function ListaDados({ itens, colunas = 2 }: { itens: [string, ReactNode][]; colunas?: 2 | 3 | 4 }) {
  const cols = { 2: "sm:grid-cols-2", 3: "sm:grid-cols-3", 4: "sm:grid-cols-2 lg:grid-cols-4" }[colunas];
  return (
    <dl className={cn("grid gap-x-6 gap-y-4", cols)}>
      {itens.map(([k, v]) => (
        <div key={k} className="min-w-0">
          <dt className="text-[11px] font-semibold tracking-wider text-subtle uppercase">{k}</dt>
          <dd className="mt-1 text-sm text-fg">{v || "—"}</dd>
        </div>
      ))}
    </dl>
  );
}

export function TabelaContainer({ children }: { children: ReactNode }) {
  return <div className="overflow-x-auto">{children}</div>;
}
