"use client";

import { createContext, startTransition, useContext, useRef, useState, type FormEvent, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import type { EstadoForm } from "@/app/actions/comum";
import { cn } from "@/lib/utils";
import { Spinner } from "./carregamento";
import { useI18n } from "./i18n-provider";
import { Modal, type TomModal } from "./modal";
import { Aviso } from "./ui";

type CtxForm = { pendente: boolean; submitter: string | null };
const PendenteCtx = createContext<CtxForm | null>(null);

/**
 * Formulário que submete via onSubmit (em vez de `action`) para que o React 19
 * não limpe os campos quando o servidor devolve erros de validação.
 */
export function Formulario({ accao, pendente, className, children }: { accao: (fd: FormData) => void; pendente: boolean; className?: string; children: ReactNode }) {
  const [submitter, setSubmitter] = useState<string | null>(null);
  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const btn = (e.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
    setSubmitter(btn?.name ? `${btn.name}=${btn.value}` : null);
    const fd = new FormData(e.currentTarget, btn);
    startTransition(() => accao(fd));
  }
  return (
    <PendenteCtx.Provider value={{ pendente, submitter }}>
      <form onSubmit={onSubmit} className={className}>
        {children}
      </form>
    </PendenteCtx.Provider>
  );
}

export type Confirmacao = { titulo: string; mensagem?: string; tom?: TomModal; rotulo?: string };

/**
 * Botão de submissão com spinner enquanto o pedido decorre.
 * Com `confirmar`, abre um modal antes de submeter (sem window.confirm).
 */
export function BotaoSubmeter({
  children,
  className = "btn-primario",
  pendente,
  name,
  value,
  confirmar,
  ...resto
}: {
  children: ReactNode;
  className?: string;
  pendente?: string;
  name?: string;
  value?: string;
  confirmar?: Confirmacao;
  "aria-label"?: string;
  title?: string;
}) {
  const { t } = useI18n();
  const status = useFormStatus();
  const ctx = useContext(PendenteCtx);
  const ref = useRef<HTMLButtonElement>(null);
  const [aberto, setAberto] = useState(false);

  const formOcupado = status.pending || !!ctx?.pendente;
  const chave = name ? `${name}=${value}` : null;
  // Spinner apenas no botão que submeteu (quando há vários no mesmo formulário)
  const esteBotao = ctx?.pendente
    ? !ctx.submitter || !chave || ctx.submitter === chave
    : status.pending
      ? !chave || status.data?.get(name!) === value
      : false;

  return (
    <>
      <button
        ref={ref}
        type="submit"
        name={name}
        value={value}
        disabled={formOcupado}
        aria-busy={esteBotao}
        className={cn(className)}
        onClick={(e) => {
          if (confirmar) {
            e.preventDefault();
            setAberto(true);
          }
        }}
        {...resto}
      >
        {esteBotao && <Spinner />}
        {esteBotao ? (pendente ?? t.comum.processando) : children}
      </button>
      {confirmar && (
        <Modal
          aberto={aberto}
          aoFechar={() => setAberto(false)}
          titulo={confirmar.titulo}
          tom={confirmar.tom}
          rodape={
            <>
              <button type="button" className="btn-secundario" onClick={() => setAberto(false)}>
                {t.comum.cancelar}
              </button>
              <button
                type="button"
                autoFocus
                className={confirmar.tom === "perigo" ? "btn-perigo" : confirmar.tom === "sucesso" ? "btn-sucesso" : "btn-primario"}
                onClick={() => {
                  setAberto(false);
                  const b = ref.current;
                  b?.form?.requestSubmit(b);
                }}
              >
                {confirmar.rotulo ?? t.comum.confirmar}
              </button>
            </>
          }
        >
          {confirmar.mensagem}
        </Modal>
      )}
    </>
  );
}

export function EstadoMensagem({ estado }: { estado: EstadoForm }) {
  if (!estado) return null;
  if (estado.ok) return <Aviso tom="sucesso">{estado.ok}</Aviso>;
  if (estado.erro || estado.erros?.length)
    return (
      <Aviso tom="erro" titulo={estado.erro}>
        {!!estado.erros?.length && (
          <ul className="list-disc space-y-0.5 pl-4">
            {estado.erros.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        )}
      </Aviso>
    );
  return null;
}
