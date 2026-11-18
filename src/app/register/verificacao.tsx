"use client";

import { Camera, CheckCircle2, Circle, IdCard, RotateCcw, ScanFace, UserRound } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Spinner } from "@/components/carregamento";
import { useI18n } from "@/components/i18n-provider";
import { Aviso } from "@/components/ui";
import { fmt, type Dicionario } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type { VerificacaoPublica } from "@/lib/verificacao";
import { FormularioRegisto } from "./formulario";

/** Componente de liveness da Regula (MIT; os serviços é que precisam de licença). Versão fixa. */
const SCRIPT_FACE_COMPONENTS = "https://unpkg.com/@regulaforensics/vp-frontend-face-components@8.4.2420/dist/main.iife.js";

type Config = { simulado: boolean; faceApiUrl: string };
type Resposta<T> = { success: boolean; message: string; code?: string; data: T };

async function api<T>(caminho: string, corpo?: unknown): Promise<Resposta<T>> {
  const res = await fetch(`/api/verificacao${caminho}`, {
    method: corpo === undefined && caminho === "" ? "GET" : "POST",
    headers: corpo !== undefined ? { "Content-Type": "application/json" } : undefined,
    body: corpo !== undefined ? JSON.stringify(corpo) : undefined,
  });
  return (await res.json().catch(() => ({ success: false, message: res.statusText, data: null }))) as Resposta<T>;
}

/** Reduz a fotografia (≤ 1800 px, JPEG) para caber no limite de pedidos do Vercel. */
async function prepararImagem(f: File): Promise<string> {
  const bmp = await createImageBitmap(f);
  const escala = Math.min(1, 1800 / Math.max(bmp.width, bmp.height));
  const c = document.createElement("canvas");
  c.width = Math.round(bmp.width * escala);
  c.height = Math.round(bmp.height * escala);
  c.getContext("2d")!.drawImage(bmp, 0, 0, c.width, c.height);
  bmp.close();
  return c.toDataURL("image/jpeg", 0.88);
}

function carregarScript(src: string) {
  return new Promise<void>((ok, erro) => {
    if (document.querySelector(`script[src="${src}"]`) && customElements.get("face-liveness")) return ok();
    const s = document.createElement("script");
    s.src = src;
    s.async = true;
    s.onload = () => ok();
    s.onerror = () => erro(new Error("script"));
    document.head.appendChild(s);
  });
}

type TextosCaptura = Dicionario["verificacao"];

/**
 * Fotografia do documento: a câmara é a opção principal (vídeo ao vivo + "Capturar");
 * anexar um ficheiro fica como alternativa. Em telemóvel usa a câmara traseira.
 */
function CapturaDocumento({ rotulo, ficheiro, onEscolher, tv }: { rotulo: string; ficheiro: File | null; onEscolher: (f: File | null) => void; tv: TextosCaptura }) {
  const [aberta, setAberta] = useState(false);
  const [erroCamera, setErroCamera] = useState<string | null>(null);
  const video = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const anexo = useRef<HTMLInputElement>(null);
  const previa = useMemo(() => (ficheiro ? URL.createObjectURL(ficheiro) : null), [ficheiro]);
  useEffect(() => () => {
    if (previa) URL.revokeObjectURL(previa);
  }, [previa]);

  const fechar = useCallback(() => {
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null;
    setAberta(false);
  }, []);
  useEffect(() => fechar, [fechar]); // liberta a câmara ao sair
  // liga a câmara ao <video> quando este aparece
  useEffect(() => {
    if (!aberta || !video.current || !stream.current) return;
    video.current.srcObject = stream.current;
    void video.current.play().catch(() => undefined);
  }, [aberta]);

  async function abrir() {
    setErroCamera(null);
    if (!navigator.mediaDevices?.getUserMedia) return setErroCamera(tv.cameraIndisponivel);
    try {
      stream.current = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" }, width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      });
      setAberta(true);
    } catch (e) {
      const nome = (e as DOMException).name;
      setErroCamera(nome === "NotAllowedError" ? tv.cameraNegada : tv.cameraIndisponivel);
    }
  }

  function capturar() {
    const v = video.current;
    if (!v || !v.videoWidth) return;
    const c = document.createElement("canvas");
    c.width = v.videoWidth;
    c.height = v.videoHeight;
    c.getContext("2d")!.drawImage(v, 0, 0);
    c.toBlob(
      (b) => {
        if (b) onEscolher(new File([b], `${rotulo.replace(/\W+/g, "-").toLowerCase()}.jpg`, { type: "image/jpeg" }));
        fechar();
      },
      "image/jpeg",
      0.92,
    );
  }

  return (
    <div className="flex flex-col gap-2 text-sm">
      <span className="font-medium text-fg">{rotulo}</span>

      {aberta ? (
        <div className="overflow-hidden rounded border-2 border-primary bg-black">
          <video ref={video} playsInline muted className="aspect-[3/2] w-full object-cover" />
          <div className="flex gap-2 bg-surface p-2">
            <button type="button" className="btn-secundario h-9 flex-1" onClick={fechar}>
              {tv.cancelarCamera}
            </button>
            <button type="button" className="btn-primario h-9 flex-1" onClick={capturar}>
              <Camera className="size-4" /> {tv.capturar}
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={abrir}
          className={cn(
            "group relative flex h-36 flex-col items-center justify-center gap-2 overflow-hidden rounded border-2 border-dashed px-3 text-center transition-colors",
            ficheiro ? "border-primary" : "border-line-strong hover:border-primary hover:bg-surface-2",
          )}
        >
          {ficheiro && previa ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={previa} alt="" className="absolute inset-0 size-full object-cover opacity-40" />
              <span className="relative z-10 rounded bg-surface/90 px-2 py-1 text-xs font-medium text-fg">{tv.fotoPronta}</span>
              <span className="relative z-10 rounded bg-surface/90 px-2 py-0.5 text-xs text-primary">{tv.tirarOutra}</span>
            </>
          ) : (
            <>
              <Camera className="size-8 text-primary" />
              <span className="font-medium text-primary">{tv.tirarFoto}</span>
            </>
          )}
        </button>
      )}

      {erroCamera && <p className="text-xs text-danger">{erroCamera}</p>}
      {!aberta && (
        <button type="button" className="self-start text-xs text-muted underline-offset-2 hover:text-fg hover:underline" onClick={() => anexo.current?.click()}>
          {tv.ouAnexar}
        </button>
      )}
      <input ref={anexo} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" tabIndex={-1} onChange={(e) => onEscolher(e.target.files?.[0] ?? null)} />
    </div>
  );
}

export function VerificacaoIdentidade({ inicial, config }: { inicial: VerificacaoPublica | null; config: Config }) {
  const { t, idioma, f } = useI18n();
  const tv = t.verificacao;
  const [v, setV] = useState<VerificacaoPublica | null>(inicial);
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [frente, setFrente] = useState<File | null>(null);
  const [verso, setVerso] = useState<File | null>(null);
  const [livenessAberto, setLivenessAberto] = useState(false);
  const caixaLiveness = useRef<HTMLDivElement>(null);

  const iniciar = useCallback(async () => {
    setOcupado(tv.aIniciar);
    setErro(null);
    const r = await api<VerificacaoPublica>("", {});
    setOcupado(null);
    if (r.success) setV(r.data);
    else setErro(r.message);
  }, [tv.aIniciar]);

  async function lerDocumento() {
    if (!frente) return;
    setOcupado(tv.aLer);
    setErro(null);
    try {
      const corpo = { frente: await prepararImagem(frente), verso: verso ? await prepararImagem(verso) : undefined };
      const r = await api<VerificacaoPublica>("/documento", corpo);
      if (r.success) setV(r.data);
      else {
        setErro(r.message);
        if (r.code === "verificacaoReprovada") setV((x) => (x ? { ...x, estado: "reprovada" } : x));
      }
    } catch {
      setErro(t.erros.imagemInvalida);
    } finally {
      setOcupado(null);
    }
  }

  const concluirLiveness = useCallback(
    async (transactionId?: string) => {
      setLivenessAberto(false);
      setErro(null);
      setOcupado(tv.aConfirmar);
      const l = await api<VerificacaoPublica>("/liveness", transactionId ? { transactionId } : {});
      if (!l.success) {
        setOcupado(null);
        setErro(l.message);
        if (l.code === "verificacaoReprovada") setV((x) => (x ? { ...x, estado: "reprovada" } : x));
        return;
      }
      setV(l.data);
      setOcupado(tv.aComparar);
      const m = await api<VerificacaoPublica>("/facematch", {});
      setOcupado(null);
      if (m.success) setV(m.data);
      else {
        setErro(m.message);
        const est = await api<VerificacaoPublica>("");
        if (est.success) setV(est.data);
      }
    },
    [tv.aConfirmar, tv.aComparar],
  );

  async function abrirLiveness() {
    setErro(null);
    if (config.simulado) return concluirLiveness();
    setOcupado(tv.aCarregarLiveness);
    try {
      await carregarScript(SCRIPT_FACE_COMPONENTS);
      setLivenessAberto(true);
    } catch {
      setErro(fmt(tv.componenteErro, { motivo: "unpkg" }));
    } finally {
      setOcupado(null);
    }
  }

  // monta o <face-liveness> quando a caixa aparece
  useEffect(() => {
    if (!livenessAberto || !caixaLiveness.current || !v) return;
    const caixa = caixaLiveness.current;
    const el = document.createElement("face-liveness") as HTMLElement & { settings?: Record<string, unknown> };
    caixa.replaceChildren(el);
    el.settings = { url: config.faceApiUrl, locale: idioma, tag: v.id.replace(/[^A-Za-z0-9_-]/g, ""), closeDisabled: false };
    const ouvir = (e: Event) => {
      const d = (e as CustomEvent<{ action: string; data?: { status?: number; reason?: string; response?: { transactionId?: string } } }>).detail;
      if (d?.action === "PROCESS_FINISHED") {
        if (d.data?.status === 1 && d.data.response?.transactionId) void concluirLiveness(d.data.response.transactionId);
        else {
          setLivenessAberto(false);
          setErro(fmt(tv.componenteErro, { motivo: d.data?.reason ?? "?" }));
        }
      } else if (d?.action === "CLOSE" || d?.action === "RETRY_COUNTER_EXCEEDED") {
        setLivenessAberto(false);
      }
    };
    el.addEventListener("face-liveness", ouvir);
    return () => {
      el.removeEventListener("face-liveness", ouvir);
      caixa.replaceChildren();
    };
  }, [livenessAberto, v, config.faceApiUrl, idioma, concluirLiveness, tv.componenteErro]);

  const estado = v?.estado;
  const passos: { chave: string; rotulo: string; icone: typeof IdCard; feito: boolean; actual: boolean }[] = [
    { chave: "doc", rotulo: tv.passoDocumento, icone: IdCard, feito: !!v?.documento && estado !== "documento", actual: estado === "documento" },
    { chave: "live", rotulo: tv.passoLiveness, icone: ScanFace, feito: estado === "facematch" || estado === "aprovada", actual: estado === "liveness" },
    { chave: "match", rotulo: tv.passoFacematch, icone: UserRound, feito: estado === "aprovada", actual: estado === "facematch" },
    { chave: "conta", rotulo: tv.passoConta, icone: CheckCircle2, feito: false, actual: estado === "aprovada" },
  ];
  const campos = v?.documento?.campos;

  return (
    <div className="grid gap-6">
      <ol className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {passos.map((p) => (
          <li
            key={p.chave}
            className={cn(
              "flex items-center gap-2 rounded border px-3 py-2 text-xs font-medium",
              p.actual ? "border-primary text-primary" : p.feito ? "border-line text-fg" : "border-line text-subtle",
            )}
          >
            {p.feito ? <CheckCircle2 className="size-4 shrink-0 text-primary" /> : p.actual ? <p.icone className="size-4 shrink-0" /> : <Circle className="size-4 shrink-0" />}
            <span className="truncate">{p.rotulo}</span>
          </li>
        ))}
      </ol>

      {config.simulado && (
        <Aviso tom="aviso" titulo={tv.simuladoT}>
          {tv.simuladoD}
        </Aviso>
      )}
      {erro && <Aviso tom="erro">{erro}</Aviso>}
      {v?.alertas.includes("autenticidadeDuvidosa") && <Aviso tom="aviso">{tv.alertaAutenticidade}</Aviso>}
      {v?.alertas.includes("idadeDiscrepante") && <Aviso tom="aviso">{tv.alertaIdade}</Aviso>}

      {ocupado && (
        <div className="flex items-center justify-center gap-3 rounded border border-line px-4 py-6 text-sm text-muted">
          <Spinner className="size-5" /> {ocupado}
        </div>
      )}

      {/* Dados lidos do documento */}
      {campos && estado !== "documento" && !ocupado && (
        <section className="rounded border border-line">
          <h2 className="border-b border-line px-4 py-2.5 text-xs font-semibold tracking-wide text-muted uppercase">{tv.dadosLidos}</h2>
          <dl className="grid gap-x-6 gap-y-3 px-4 py-3 text-sm sm:grid-cols-2">
            {(
              [
                [tv.tipoDoc, v?.documento?.tipoDocumento],
                [tv.nomeDoc, campos.nomeCompleto],
                [tv.numeroDoc, campos.numeroDocumento],
                [tv.dataNasc, campos.dataNascimento && f.data(campos.dataNascimento)],
                [tv.validade, campos.dataValidade && f.data(campos.dataValidade)],
                [tv.nacionalidade, campos.nacionalidade],
              ] as [string, string | undefined][]
            )
              .filter(([, val]) => val)
              .map(([rot, val]) => (
                <div key={rot}>
                  <dt className="text-xs text-muted">{rot}</dt>
                  <dd className="font-medium text-fg">{val}</dd>
                </div>
              ))}
          </dl>
        </section>
      )}

      {/* 0. Sem verificação activa */}
      {(!v || estado === "usada") && !ocupado && (
        <div className="flex justify-center">
          <button type="button" className="btn-primario h-11 px-6" onClick={iniciar}>
            <IdCard className="size-4" /> {tv.iniciar}
          </button>
        </div>
      )}

      {/* 1. Documento */}
      {estado === "documento" && !ocupado && (
        <section className="grid gap-4">
          <p className="text-sm text-muted">{tv.instrDocumento}</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <CapturaDocumento rotulo={tv.frente} ficheiro={frente} onEscolher={setFrente} tv={tv} />
            <CapturaDocumento rotulo={tv.verso} ficheiro={verso} onEscolher={setVerso} tv={tv} />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-xs text-subtle">
              {!frente ? tv.seleccioneFrente : v && fmt(tv.tentativas, { n: v.tentativasRestantes.documento })}
            </span>
            <button type="button" className="btn-primario h-10 px-5 disabled:cursor-not-allowed disabled:opacity-50" disabled={!frente} onClick={lerDocumento}>
              {tv.lerDocumento}
            </button>
          </div>
        </section>
      )}

      {/* 2. Liveness (+ 3. face match automático) */}
      {(estado === "liveness" || estado === "facematch") && !ocupado && (
        <section className="grid gap-4">
          <p className="text-sm text-muted">{tv.instrLiveness}</p>
          {livenessAberto ? (
            <div ref={caixaLiveness} className="min-h-[420px] overflow-hidden rounded border border-line" />
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="text-xs text-subtle">{v && fmt(tv.tentativas, { n: Math.min(v.tentativasRestantes.liveness, v.tentativasRestantes.facematch) })}</span>
              <div className="flex flex-wrap gap-2">
                <button type="button" className="btn-secundario h-10 px-4" onClick={iniciar}>
                  {tv.outroDocumento}
                </button>
                <button type="button" className="btn-primario h-10 px-5" onClick={abrirLiveness}>
                  {config.simulado ? tv.simularLiveness : tv.iniciarLiveness}
                </button>
              </div>
            </div>
          )}
        </section>
      )}

      {estado === "reprovada" && !ocupado && (
        <Aviso
          tom="erro"
          titulo={tv.reprovadaT}
          accao={
            <button type="button" className="btn-secundario h-9 px-3" onClick={iniciar}>
              <RotateCcw className="size-4" /> {tv.recomecar}
            </button>
          }
        >
          {tv.reprovadaD}
        </Aviso>
      )}

      {/* 4. Conta */}
      {estado === "aprovada" && (
        <>
          <Aviso tom="sucesso" titulo={tv.aprovadaT}>
            {fmt(tv.aprovadaD, { s: v?.facematch?.similaridade ?? "—", l: v?.facematch?.limiar ?? "—" })}
          </Aviso>
          <FormularioRegisto
            verificados={{
              nome: campos?.nomeCompleto,
              bi: campos?.numeroDocumento,
              dataNascimento: campos?.dataNascimento,
              bloqueados: !v?.simulado,
            }}
          />
        </>
      )}
    </div>
  );
}
