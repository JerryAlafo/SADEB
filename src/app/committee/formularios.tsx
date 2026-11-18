"use client";

import { useActionState, useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Ban, Calculator, Check, CheckCircle2, Clock, RotateCcw, X } from "lucide-react";
import { ajustarResultadoAction, aprovarPublicarAction, executarCalculoAction, solicitarCorreccaoAction } from "@/app/actions/comissao";
import { CampoAreaTexto, CampoSelect } from "@/components/campos";
import { BotaoSubmeter, EstadoMensagem, Formulario } from "@/components/formularios";
import { useI18n } from "@/components/i18n-provider";
import { Aviso } from "@/components/ui";
import { fmt } from "@/lib/i18n";
import type { Resultado } from "@/lib/types";
import { cn } from "@/lib/utils";

export function FormCalculo({ bolsaId, recalcular = false }: { bolsaId: string; recalcular?: boolean }) {
  const { t } = useI18n();
  const [estado, accao] = useActionState(executarCalculoAction, undefined);
  return (
    <form action={accao} className="space-y-3">
      <input type="hidden" name="bolsaId" value={bolsaId} />
      <BotaoSubmeter
        className={recalcular ? "btn-secundario w-full" : "btn-primario"}
        pendente={t.comissao.aCalcular}
        confirmar={
          recalcular
            ? { titulo: t.comissao.confirmarRecalculoT, mensagem: t.comissao.confirmarRecalculo, tom: "aviso", rotulo: t.comissao.recalcular }
            : { titulo: t.comissao.confirmarCalculoT, mensagem: t.comissao.confirmarCalculo, rotulo: t.comissao.executar }
        }
      >
        {recalcular ? <RotateCcw className="size-4" /> : <Calculator className="size-4" />}
        {recalcular ? t.comissao.recalcular : t.comissao.executar}
      </BotaoSubmeter>
      <EstadoMensagem estado={estado} />
    </form>
  );
}

export function FormAprovar({ bolsaId, resumo }: { bolsaId: string; resumo: string }) {
  const { t } = useI18n();
  const [estado, accao] = useActionState(aprovarPublicarAction, undefined);
  return (
    <form action={accao} className="space-y-3">
      <input type="hidden" name="bolsaId" value={bolsaId} />
      <BotaoSubmeter className="btn-sucesso w-full" pendente={t.comissao.aAprovar} confirmar={{ titulo: t.comissao.confirmarAprovarT, mensagem: fmt(t.comissao.confirmarAprovar, { resumo }), tom: "sucesso", rotulo: t.comissao.aprovar }}>
        <CheckCircle2 className="size-4" />
        {t.comissao.aprovar}
      </BotaoSubmeter>
      <EstadoMensagem estado={estado} />
    </form>
  );
}

type AjusteProps = {
  candidaturaId: string;
  resultadoSistema: Resultado;
  resultadoFinal: Resultado;
  justificacao?: string;
  /** Concurso já publicado: a alteração é uma rectificação comunicada ao candidato. */
  rectificacao?: boolean;
};

const OPCOES: Resultado[] = ["seleccionado", "lista_espera", "nao_seleccionado"];

function CorpoAjuste({
  candidaturaId,
  resultadoSistema,
  resultadoFinal,
  justificacao,
  rectificacao,
  inicial,
  aoConcluir,
}: AjusteProps & { inicial?: Resultado; aoConcluir?: () => void }) {
  const { t } = useI18n();
  const k = t.comissao;
  const [estado, accao, pendente] = useActionState(ajustarResultadoAction, undefined);
  useEffect(() => {
    if (estado?.ok) aoConcluir?.();
  }, [estado, aoConcluir]);
  const opcoes = OPCOES.map((r) => ({ value: r, label: `${t.resultado[r]}${r === resultadoSistema ? ` ${k.sistemaSufixo}` : ""}` }));
  return (
    <Formulario accao={accao} pendente={pendente} className="space-y-4">
      <input type="hidden" name="candidaturaId" value={candidaturaId} />
      {rectificacao && <Aviso tom="aviso">{k.rectificacaoAjuda}</Aviso>}
      <CampoSelect name="resultado" label={k.decisaoFinal} defaultValue={inicial ?? resultadoFinal} options={opcoes} />
      <div>
        <CampoAreaTexto name="justificacao" label={k.justificacao} rows={4} defaultValue={rectificacao ? "" : justificacao} required={rectificacao} />
        {!rectificacao && <p className="mt-1 px-1 text-xs text-subtle">{k.justificacaoAjuda}</p>}
      </div>
      <EstadoMensagem estado={estado} />
      <div className="flex justify-end">
        <BotaoSubmeter pendente={t.comum.aGuardar}>{rectificacao ? k.rectificar : k.registarAjuste}</BotaoSubmeter>
      </div>
    </Formulario>
  );
}

/** Formulário de decisão (página de detalhe do candidato). */
export function FormAjuste(props: AjusteProps) {
  return <CorpoAjuste {...props} />;
}

const ESTILO_OPCAO: Record<Resultado, { icone: typeof Check; activo: string; hover: string }> = {
  seleccionado: { icone: Check, activo: "border-success bg-success text-white dark:text-bg", hover: "hover:border-success hover:text-success" },
  lista_espera: { icone: Clock, activo: "border-warning bg-warning text-white dark:text-bg", hover: "hover:border-warning hover:text-warning" },
  nao_seleccionado: { icone: Ban, activo: "border-danger bg-danger text-white dark:text-bg", hover: "hover:border-danger hover:text-danger" },
};

/**
 * Decisão da Comissão na lista de classificação: três botões
 * (Aprovar · Lista de espera · Recusar). O botão activo é a decisão actual;
 * clicar noutro abre o painel lateral para confirmar e justificar.
 */
export function DecisaoCandidato(props: AjusteProps & { nome: string; codigo: string; bloqueio?: string }) {
  const { t } = useI18n();
  const k = t.comissao;
  const [escolha, setEscolha] = useState<Resultado | null>(null);
  const fechar = useCallback(() => setEscolha(null), []);
  useEffect(() => {
    if (!escolha) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && fechar();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [escolha, fechar]);

  const rotulo = { seleccionado: k.aprovarCand, lista_espera: k.esperaCand, nao_seleccionado: k.recusarCand };

  return (
    <>
      <div role="group" aria-label={k.colDecisao} title={props.bloqueio} className={cn("inline-flex", props.bloqueio && "cursor-not-allowed opacity-50")}>
        {OPCOES.map((r, i) => {
          const { icone: Icone, activo, hover } = ESTILO_OPCAO[r];
          const actual = !props.bloqueio && props.resultadoFinal === r;
          return (
            <button
              key={r}
              type="button"
              disabled={!!props.bloqueio}
              aria-pressed={actual}
              onClick={() => setEscolha(r)}
              className={cn(
                "inline-flex h-8 items-center gap-1.5 border px-2.5 text-xs font-medium whitespace-nowrap transition-colors disabled:pointer-events-none",
                i === 0 ? "rounded-l" : "-ml-px",
                i === OPCOES.length - 1 && "rounded-r",
                actual ? cn(activo, "relative z-10") : cn("border-line-strong bg-surface text-muted", hover),
              )}
            >
              <Icone className="size-3.5" strokeWidth={2.5} />
              {rotulo[r]}
            </button>
          );
        })}
      </div>

      {escolha &&
        createPortal(
          <div className="fixed inset-0 z-[100] flex justify-end">
            <button type="button" aria-label={t.comum.cancelar} className="absolute inset-0 bg-black/40" onClick={fechar} />
            <aside role="dialog" aria-modal="true" className="relative flex h-full w-full max-w-md flex-col border-l border-line bg-surface shadow-2xl">
              <header className="flex items-start justify-between gap-3 border-b border-line px-6 py-4">
                <div className="min-w-0">
                  <p className="font-mono text-[11px] text-subtle">{props.codigo}</p>
                  <h2 className="truncate text-base font-semibold text-fg">{props.rectificacao ? k.rectificar : k.colDecisao}</h2>
                  <p className="truncate text-sm text-fg">{props.nome}</p>
                  <p className="mt-1 text-xs text-muted">
                    {fmt(k.sistemaRes, { r: t.resultado[props.resultadoSistema] })} · {fmt(k.decisaoActual, { r: t.resultado[props.resultadoFinal] })}
                  </p>
                </div>
                <button type="button" onClick={fechar} className="rounded p-1.5 text-subtle hover:bg-surface-2 hover:text-fg" aria-label={t.comum.cancelar}>
                  <X className="size-5" />
                </button>
              </header>
              <div className="flex-1 space-y-4 overflow-y-auto px-6 py-6">
                <p className="text-sm text-muted">{k.escolherDecisao}</p>
                <CorpoAjuste {...props} inicial={escolha} aoConcluir={fechar} />
              </div>
            </aside>
          </div>,
          document.body,
        )}
    </>
  );
}

export function FormCorreccao({ candidaturaId }: { candidaturaId: string }) {
  const { t } = useI18n();
  const [estado, accao, pendente] = useActionState(solicitarCorreccaoAction, undefined);
  return (
    <Formulario accao={accao} pendente={pendente} className="space-y-4">
      <input type="hidden" name="candidaturaId" value={candidaturaId} />
      <CampoAreaTexto name="pendencias" label={t.comissao.pendenciasLabel} rows={3} required />
      <EstadoMensagem estado={estado} />
      <div className="flex justify-end">
        <BotaoSubmeter className="btn-secundario" pendente={t.comum.aEnviar}>
          {t.comissao.enviarCorreccao}
        </BotaoSubmeter>
      </div>
    </Formulario>
  );
}
