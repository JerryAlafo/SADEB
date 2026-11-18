"use client";

// Inputs com label flutuante — mesmo padrão dos backoffices (backoffice-regulador):
// borda fina, label sobre a linha da borda quando focado/preenchido, cor de marca no foco.
import * as React from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown, Eye, EyeOff, Paperclip } from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "./i18n-provider";

const BASE_CAMPO =
  "peer w-full rounded-md border bg-transparent px-3 pt-4 pb-2.5 text-sm text-fg outline-none transition-colors disabled:cursor-not-allowed disabled:opacity-60";
const BORDA = (erro?: boolean) =>
  erro ? "border-danger focus-visible:border-danger" : "border-line-strong hover:border-subtle focus-visible:border-primary";

function Rotulo({ htmlFor, activo, erro, obrigatorio, children, topo = false }: { htmlFor?: string; activo: boolean; erro?: boolean; obrigatorio?: boolean; children: React.ReactNode; topo?: boolean }) {
  return (
    <label
      htmlFor={htmlFor}
      className={cn(
        "pointer-events-none absolute left-3 z-10 max-w-[calc(100%-1.5rem)] truncate bg-surface px-1 text-sm transition-all duration-200",
        topo ? "top-3.5" : "top-1/2 -translate-y-1/2",
        "peer-focus:-top-2.5 peer-focus:translate-y-0 peer-focus:text-xs",
        activo && "!-top-2.5 !translate-y-0 !text-xs",
        erro ? "text-danger" : "text-subtle peer-focus:text-primary",
      )}
    >
      {children}
      {obrigatorio && <span className="ml-0.5 text-danger">*</span>}
    </label>
  );
}

interface CampoTextoProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  erro?: boolean;
  ajuda?: string;
}

export const CampoTexto = React.forwardRef<HTMLInputElement, CampoTextoProps>(function CampoTexto(
  { className, label, erro, ajuda, required, id, value, ...props },
  ref,
) {
  const autoId = React.useId();
  const campoId = id ?? autoId;
  const [focado, setFocado] = React.useState(false);
  const [temValorDom, setTemValorDom] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const mergedRef = React.useCallback(
    (node: HTMLInputElement | null) => {
      inputRef.current = node;
      if (typeof ref === "function") ref(node);
      else if (ref) ref.current = node;
    },
    [ref],
  );
  const sincronizar = React.useCallback(() => setTemValorDom((inputRef.current?.value?.length ?? 0) > 0), []);

  React.useEffect(() => {
    sincronizar();
    const el = inputRef.current;
    if (!el) return;
    const onAnim = (e: AnimationEvent) => e.animationName.toLowerCase().includes("autofill") && requestAnimationFrame(sincronizar);
    el.addEventListener("animationstart", onAnim);
    // reset do formulário
    const form = el.form;
    const onReset = () => requestAnimationFrame(sincronizar);
    form?.addEventListener("reset", onReset);
    return () => {
      el.removeEventListener("animationstart", onAnim);
      form?.removeEventListener("reset", onReset);
    };
  }, [sincronizar]);

  const temValor = value != null && String(value).length > 0;
  const placeholderVisivel = props.placeholder != null && String(props.placeholder).length > 0;
  const activo = focado || temValor || temValorDom || placeholderVisivel || props.type === "date";

  return (
    <div className="w-full">
      <div className="relative w-full">
        <input
          ref={mergedRef}
          id={campoId}
          required={required}
          value={value}
          {...props}
          className={cn(BASE_CAMPO, BORDA(erro), props.type === "date" && "date-hide-placeholder", className)}
          data-has-value={temValor || temValorDom ? "" : undefined}
          placeholder={props.placeholder ?? " "}
          onFocus={(e) => {
            setFocado(true);
            props.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocado(false);
            sincronizar();
            props.onBlur?.(e);
          }}
          onChange={(e) => {
            sincronizar();
            props.onChange?.(e);
          }}
        />
        <Rotulo htmlFor={campoId} activo={activo} erro={erro} obrigatorio={required}>
          {label}
        </Rotulo>
      </div>
      {ajuda && <p className="mt-1 px-1 text-xs text-subtle">{ajuda}</p>}
    </div>
  );
});

export function CampoSenha(props: Omit<CampoTextoProps, "type">) {
  const { t } = useI18n();
  const [visivel, setVisivel] = React.useState(false);
  return (
    <div className="relative">
      <CampoTexto {...props} type={visivel ? "text" : "password"} className={cn("pr-10", props.className)} />
      <button
        type="button"
        tabIndex={-1}
        onClick={() => setVisivel((v) => !v)}
        aria-label={visivel ? t.comum.ocultarSenha : t.comum.mostrarSenha}
        className="absolute top-[22px] right-3 -translate-y-1/2 text-subtle transition-colors hover:text-fg"
      >
        {visivel ? <EyeOff className="size-[18px]" /> : <Eye className="size-[18px]" />}
      </button>
    </div>
  );
}

export function CampoAreaTexto({
  label,
  erro,
  required,
  id,
  className,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string; erro?: boolean }) {
  const autoId = React.useId();
  const campoId = id ?? autoId;
  const [focado, setFocado] = React.useState(false);
  const [temValor, setTemValor] = React.useState(Boolean(props.defaultValue || props.value));
  return (
    <div className="relative w-full">
      <textarea
        id={campoId}
        required={required}
        {...props}
        placeholder={props.placeholder ?? " "}
        className={cn(BASE_CAMPO, BORDA(erro), "min-h-24 resize-y pt-5 leading-relaxed", className)}
        onFocus={(e) => {
          setFocado(true);
          props.onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocado(false);
          setTemValor(e.target.value.length > 0);
          props.onBlur?.(e);
        }}
        onChange={(e) => {
          setTemValor(e.target.value.length > 0);
          props.onChange?.(e);
        }}
      />
      <Rotulo htmlFor={campoId} activo={focado || temValor || Boolean(props.placeholder)} erro={erro} obrigatorio={required} topo>
        {label}
      </Rotulo>
    </div>
  );
}

interface CampoSelectProps {
  label: string;
  name?: string;
  options: { label: string; value: string }[];
  value?: string;
  defaultValue?: string;
  onValueChange?: (v: string) => void;
  placeholder?: string;
  required?: boolean;
  erro?: boolean;
  disabled?: boolean;
  className?: string;
  id?: string;
}

/** Select com dropdown próprio (como o FloatingLabelSelect do backoffice) + input escondido para FormData. */
export function CampoSelect({ label, name, options, value, defaultValue, onValueChange, placeholder, required, erro, disabled, className, id }: CampoSelectProps) {
  const { t } = useI18n();
  const autoId = React.useId();
  const campoId = id ?? autoId;
  const [interno, setInterno] = React.useState(defaultValue ?? "");
  const actual = value ?? interno;
  const [aberto, setAberto] = React.useState(false);
  const [destaque, setDestaque] = React.useState(-1);
  const ref = React.useRef<HTMLDivElement>(null);
  const btnRef = React.useRef<HTMLButtonElement>(null);
  const menuRef = React.useRef<HTMLUListElement>(null);
  const [estiloMenu, setEstiloMenu] = React.useState<React.CSSProperties>({});

  const escolher = (v: string) => {
    if (value === undefined) setInterno(v);
    onValueChange?.(v);
    setAberto(false);
    btnRef.current?.focus();
  };

  React.useEffect(() => {
    if (!aberto) return;
    const posicionar = () => {
      const r = btnRef.current?.getBoundingClientRect();
      if (r) setEstiloMenu({ position: "fixed", top: r.bottom + 4, left: r.left, width: r.width, zIndex: 9999 });
    };
    posicionar();
    const fora = (e: MouseEvent) => {
      const alvo = e.target as Node;
      if (!ref.current?.contains(alvo) && !menuRef.current?.contains(alvo)) setAberto(false);
    };
    document.addEventListener("mousedown", fora);
    window.addEventListener("scroll", posicionar, true);
    window.addEventListener("resize", posicionar);
    return () => {
      document.removeEventListener("mousedown", fora);
      window.removeEventListener("scroll", posicionar, true);
      window.removeEventListener("resize", posicionar);
    };
  }, [aberto]);

  const seleccionado = options.find((o) => o.value === actual);
  const activo = aberto || !!seleccionado;

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (!aberto) {
        setAberto(true);
        setDestaque(Math.max(0, options.findIndex((o) => o.value === actual)));
        return;
      }
      setDestaque((i) => (e.key === "ArrowDown" ? Math.min(options.length - 1, i + 1) : Math.max(0, i - 1)));
    } else if ((e.key === "Enter" || e.key === " ") && aberto && destaque >= 0) {
      e.preventDefault();
      escolher(options[destaque].value);
    } else if (e.key === "Escape") setAberto(false);
  };

  return (
    <div ref={ref} className="relative w-full">
      {name && <input type="hidden" name={name} value={actual} />}
      <button
        type="button"
        id={campoId}
        ref={btnRef}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={aberto}
        onClick={() => setAberto((a) => !a)}
        onKeyDown={onKeyDown}
        className={cn(BASE_CAMPO, BORDA(erro), "flex items-center justify-between gap-2 text-left", className)}
      >
        <span className={cn("truncate", !seleccionado && "text-transparent")}>{seleccionado?.label ?? placeholder ?? t.comum.seleccione}</span>
        <ChevronDown className={cn("size-4 shrink-0 text-subtle transition-transform", aberto && "rotate-180")} />
      </button>
      <Rotulo htmlFor={campoId} activo={activo} erro={erro} obrigatorio={required}>
        {label}
      </Rotulo>
      {aberto &&
        createPortal(
          <ul ref={menuRef} role="listbox" style={estiloMenu} className="max-h-64 overflow-auto rounded-md border border-line bg-surface py-1 shadow-lg shadow-black/10">
            {options.map((o, i) => (
              <li key={o.value}>
                <button
                  type="button"
                  role="option"
                  aria-selected={o.value === actual}
                  onMouseEnter={() => setDestaque(i)}
                  onClick={() => escolher(o.value)}
                  className={cn(
                    "flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm",
                    i === destaque ? "bg-surface-2" : "",
                    o.value === actual ? "font-medium text-primary" : "text-fg",
                  )}
                >
                  {o.label}
                  {o.value === actual && <Check className="size-3.5" />}
                </button>
              </li>
            ))}
          </ul>,
          document.body,
        )}
    </div>
  );
}

export function CaixaSeleccao({ label, className, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label: React.ReactNode }) {
  return (
    <label className={cn("flex cursor-pointer items-start gap-2.5 text-sm text-fg select-none", className)}>
      <input type="checkbox" {...props} className="peer sr-only" />
      <span className="mt-px grid size-4 shrink-0 place-items-center rounded-sm border border-line-strong bg-surface transition-colors peer-checked:border-primary peer-checked:bg-primary peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-primary [&>svg]:opacity-0 peer-checked:[&>svg]:opacity-100">
        <Check className="size-3 text-primary-fg" strokeWidth={3} />
      </span>
      <span>{label}</span>
    </label>
  );
}

/** Selector de ficheiro com aparência de campo. */
export function CampoFicheiro({ name, accept, required }: { name: string; accept?: string; required?: boolean }) {
  const { t } = useI18n();
  const [nome, setNome] = React.useState("");
  const ref = React.useRef<HTMLInputElement>(null);
  React.useEffect(() => {
    const form = ref.current?.form;
    const limpar = () => setNome("");
    form?.addEventListener("reset", limpar);
    return () => form?.removeEventListener("reset", limpar);
  }, []);
  return (
    <label className="flex h-8 min-w-0 flex-1 cursor-pointer items-center gap-2 rounded-md border border-line-strong px-2.5 text-xs text-muted transition-colors hover:border-subtle">
      <Paperclip className="size-3.5 shrink-0" />
      <span className="truncate">{nome || t.candidatura.escolherFicheiro}</span>
      <input ref={ref} type="file" name={name} accept={accept} required={required} className="sr-only" onChange={(e) => setNome(e.target.files?.[0]?.name ?? "")} />
    </label>
  );
}
