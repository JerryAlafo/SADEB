"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  Bell,
  ClipboardCheck,
  FileStack,
  FolderOpen,
  History,
  LayoutDashboard,
  LogOut,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  ScrollText,
  Settings2,
  ShieldCheck,
  User,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import { sair } from "@/app/actions/auth";
import { cn, iniciais } from "@/lib/utils";
import { useFormStatus } from "react-dom";
import { Spinner } from "./carregamento";
import { useI18n } from "./i18n-provider";
import { AlternarTema, SeletorIdioma } from "./preferencias";
import { Emblema } from "./ui";

const ICONES = {
  painel: LayoutDashboard,
  concursos: FolderOpen,
  candidaturas: FileStack,
  avaliacao: ClipboardCheck,
  historico: History,
  bolsas: Settings2,
  utilizadores: Users,
  auditoria: ScrollText,
  seguranca: ShieldCheck,
} satisfies Record<string, LucideIcon>;

export type ItemNav = { href: string; rotulo: string; icone: keyof typeof ICONES; exacto?: boolean };
export type GrupoNav = { titulo: string; itens: ItemNav[] };

type Props = {
  portal: string;
  grupos: GrupoNav[];
  utilizador: { nome: string; email: string; papel: string };
  naoLidas: number;
  recolhidoInicial: boolean;
  children: ReactNode;
};

function activo(path: string, item: ItemNav) {
  return item.exacto ? path === item.href : path === item.href || path.startsWith(`${item.href}/`);
}

export function Shell({ portal, grupos, utilizador, naoLidas, recolhidoInicial, children }: Props) {
  const { t } = useI18n();
  const path = usePathname();
  const [recolhido, setRecolhido] = useState(recolhidoInicial);
  const [movel, setMovel] = useState(false);

  const alternarRecolhido = () => {
    const novo = !recolhido;
    document.cookie = `sadeb_sidebar=${novo ? "1" : "0"}; path=/; max-age=31536000; samesite=lax`;
    setRecolhido(novo);
  };

  // item activo mais específico (para títulos)
  const todos = grupos.flatMap((g) => g.itens);
  const actual = todos.filter((i) => activo(path, i)).sort((a, b) => b.href.length - a.href.length)[0];

  const barra = (compacto: boolean) => (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-fg">
      <div className={cn("flex h-16 shrink-0 items-center gap-3 border-b border-sidebar-line", compacto ? "justify-center px-2" : "px-5")}>
        <Emblema className="size-8 shrink-0" />
        {!compacto && (
          <div className="min-w-0 leading-tight">
            <p className="text-sm font-semibold tracking-wide text-white">{t.app.sigla}</p>
            <p className="truncate text-[11px] text-sidebar-muted">{t.app.instituicao}</p>
          </div>
        )}
        <button type="button" onClick={() => setMovel(false)} className="ml-auto rounded p-1.5 text-sidebar-muted hover:text-white lg:hidden" aria-label={t.comum.fecharMenu}>
          <X className="size-5" />
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {grupos.map((g) => (
          <div key={g.titulo} className="mb-5">
            {!compacto && <p className="mb-2 px-3 text-[10px] font-semibold tracking-[0.14em] text-sidebar-muted uppercase">{g.titulo}</p>}
            <ul className="space-y-0.5">
              {g.itens.map((item) => {
                const Icone = ICONES[item.icone];
                const on = actual?.href === item.href;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={() => setMovel(false)}
                      title={compacto ? item.rotulo : undefined}
                      aria-current={on ? "page" : undefined}
                      className={cn(
                        "relative flex h-9 items-center gap-3 rounded px-3 text-sm transition-colors",
                        compacto && "justify-center px-0",
                        on ? "bg-sidebar-active font-medium text-white" : "hover:bg-white/5 hover:text-white",
                      )}
                    >
                      {on && <span className="absolute inset-y-1.5 left-0 w-[3px] bg-accent" />}
                      <Icone className={cn("size-[17px] shrink-0", on ? "text-white" : "text-sidebar-muted")} strokeWidth={1.75} />
                      {!compacto && <span className="truncate">{item.rotulo}</span>}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className={cn("flex h-14 shrink-0 items-center border-t border-sidebar-line px-3", compacto ? "justify-center" : "justify-between")}>
        {!compacto && <span className="px-2 font-mono text-[11px] text-sidebar-muted">{t.app.versao}</span>}
        <button
          type="button"
          onClick={alternarRecolhido}
          title={compacto ? t.comum.expandirMenu : t.comum.recolherMenu}
          className="hidden rounded p-2 text-sidebar-muted hover:bg-white/5 hover:text-white lg:block"
        >
          {compacto ? <PanelLeftOpen className="size-[17px]" /> : <PanelLeftClose className="size-[17px]" />}
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-dvh min-h-0 w-full overflow-hidden">
      <aside className={cn("hidden shrink-0 transition-[width] duration-200 lg:block", recolhido ? "w-[68px]" : "w-64")}>{barra(recolhido)}</aside>
      {movel && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button type="button" aria-label={t.comum.fecharMenu} onClick={() => setMovel(false)} className="absolute inset-0 bg-black/50" />
          <aside className="absolute inset-y-0 left-0 w-72 shadow-xl">{barra(false)}</aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 shrink-0 items-center gap-3 border-b border-line bg-surface px-4 sm:px-6">
          <button type="button" onClick={() => setMovel(true)} className="rounded p-2 text-muted hover:bg-surface-2 lg:hidden" aria-label={t.comum.menu}>
            <Menu className="size-5" />
          </button>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[11px] font-semibold tracking-wider text-subtle uppercase">{portal}</p>
            <p className="truncate text-sm font-semibold text-fg">
              {actual?.rotulo ?? (path.startsWith("/profile") ? t.comum.perfil : path.startsWith("/notifications") ? t.comum.notificacoes : "")}
            </p>
          </div>
          <div className="flex items-center gap-1">
            <SeletorIdioma />
            <AlternarTema />
            <Link href="/notifications" className="relative inline-flex size-9 items-center justify-center rounded text-muted hover:bg-surface-2 hover:text-fg" aria-label={t.comum.notificacoes}>
              <Bell className="size-[18px]" />
              {naoLidas > 0 && (
                <span className="absolute top-1 right-1 grid h-4 min-w-4 place-items-center rounded-sm bg-danger px-1 text-[10px] font-semibold text-white">{naoLidas}</span>
              )}
            </Link>
            <span className="mx-2 h-7 w-px bg-line" />
            <MenuUtilizador utilizador={utilizador} />
          </div>
        </header>
        <main className="min-h-0 flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-[1400px] px-4 py-6 sm:px-8 sm:py-8">{children}</div>
          <footer className="border-t border-line px-8 py-4 text-center text-xs text-subtle">
            © {new Date().getFullYear()} {t.app.instituicao} · {t.app.departamento} · {t.app.sigla}
          </footer>
        </main>
      </div>
    </div>
  );
}

function MenuUtilizador({ utilizador }: { utilizador: Props["utilizador"] }) {
  const { t } = useI18n();
  const [aberto, setAberto] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!aberto) return;
    const fora = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setAberto(false);
    document.addEventListener("mousedown", fora);
    return () => document.removeEventListener("mousedown", fora);
  }, [aberto]);

  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setAberto((a) => !a)} className="flex items-center gap-2.5 rounded py-1 pr-2 pl-1 hover:bg-surface-2" aria-expanded={aberto}>
        <span className="grid size-8 place-items-center rounded-sm bg-primary text-xs font-semibold text-primary-fg">{iniciais(utilizador.nome)}</span>
        <span className="hidden text-left leading-tight md:block">
          <span className="block max-w-40 truncate text-sm font-medium text-fg">{utilizador.nome}</span>
          <span className="block text-[11px] text-subtle">{utilizador.papel}</span>
        </span>
      </button>
      {aberto && (
        <div className="absolute top-full right-0 z-50 mt-1 w-64 rounded-md border border-line bg-surface shadow-lg shadow-black/10">
          <div className="border-b border-line px-4 py-3">
            <p className="truncate text-sm font-medium text-fg">{utilizador.nome}</p>
            <p className="truncate text-xs text-muted">{utilizador.email}</p>
          </div>
          <div className="py-1">
            <Link href="/profile" onClick={() => setAberto(false)} className="flex items-center gap-2.5 px-4 py-2 text-sm text-fg hover:bg-surface-2">
              <User className="size-4 text-subtle" />
              {t.comum.perfil}
            </Link>
            <form action={sair}>
              <BotaoSair rotulo={t.comum.sair} />
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function BotaoSair({ rotulo }: { rotulo: string }) {
  const { pending } = useFormStatus();
  return (
    <button disabled={pending} className="flex w-full items-center gap-2.5 px-4 py-2 text-left text-sm text-danger hover:bg-surface-2 disabled:opacity-70">
      {pending ? <Spinner /> : <LogOut className="size-4" />}
      {rotulo}
    </button>
  );
}
