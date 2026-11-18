// ─────────────────────────────────────────────────────────────
// SADEB — Cliente das APIs Regula Forensics (servidor)
//
//   Document Reader Web API  POST {REGULA_DOCREADER_URL}/api/process         → OCR + autenticidade + retrato
//   Face API                 GET  {REGULA_FACEAPI_URL}/api/v2/liveness       → resultado do liveness
//                            POST {REGULA_FACEAPI_URL}/api/match             → face match
//
// O liveness é capturado no browser pelo componente <face-liveness>
// (@regulaforensics/vp-frontend-face-components), que fala directamente com a Face API.
// O servidor NUNCA confia no resultado enviado pelo browser: recebe só o transactionId
// e vai buscar o resultado à Face API.
//
// Modo simulado (REGULA_SIMULADO=1): respostas fictícias para desenvolvimento sem licença.
// Em produção é recusado, a não ser que REGULA_SIMULADO=1 esteja definido explicitamente.
// ─────────────────────────────────────────────────────────────
import { randomInt } from "node:crypto";

const DOCREADER_URL = (process.env.REGULA_DOCREADER_URL ?? "").replace(/\/+$/, "");
const FACEAPI_URL = (process.env.REGULA_FACEAPI_URL ?? "").replace(/\/+$/, "");
/** URL da Face API visto pelo browser (componente de liveness). Por omissão igual a REGULA_FACEAPI_URL. */
const FACEAPI_URL_PUBLICO = (process.env.NEXT_PUBLIC_REGULA_FACEAPI_URL ?? process.env.REGULA_FACEAPI_URL ?? "").replace(/\/+$/, "");
/** Licença em base64 enviada em cada pedido ao Document Reader (opcional se estiver montada no servidor). */
const DOCREADER_LICENCA = process.env.REGULA_DOCREADER_LICENSE ?? "";
/** Cabeçalho de autorização opcional (ex.: se os serviços estiverem atrás de um proxy com Basic/Bearer). */
const AUTORIZACAO = process.env.REGULA_AUTHORIZATION ?? "";
const TIMEOUT_MS = Number(process.env.REGULA_TIMEOUT_MS ?? 45000) || 45000;

export const SIMULADO = process.env.REGULA_SIMULADO === "1" || (!DOCREADER_URL && !FACEAPI_URL && process.env.NODE_ENV !== "production");

export class ErroRegula extends Error {
  constructor(
    public chave: "regulaIndisponivel" | "regulaNaoConfigurado" | "regulaLicenca",
    detalhe?: string,
  ) {
    super(detalhe ?? chave);
  }
}

export function configuracaoPublica() {
  return { simulado: SIMULADO, faceApiUrl: SIMULADO ? "" : FACEAPI_URL_PUBLICO };
}

async function pedir<T>(base: string, caminho: string, init: RequestInit = {}): Promise<T> {
  if (!base) throw new ErroRegula("regulaNaoConfigurado", `URL em falta para ${caminho}`);
  let res: Response;
  try {
    res = await fetch(`${base}${caminho}`, {
      ...init,
      cache: "no-store",
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: {
        Accept: "application/json",
        ...(init.body ? { "Content-Type": "application/json" } : {}),
        ...(AUTORIZACAO ? { Authorization: AUTORIZACAO } : {}),
      },
    });
  } catch (e) {
    throw new ErroRegula("regulaIndisponivel", `${caminho}: ${(e as Error).message}`);
  }
  if (res.status === 403) throw new ErroRegula("regulaLicenca", `${caminho}: 403 (licença inválida ou em falta)`);
  if (!res.ok) throw new ErroRegula("regulaIndisponivel", `${caminho}: HTTP ${res.status} ${(await res.text().catch(() => "")).slice(0, 300)}`);
  return (await res.json()) as T;
}

/** Aceita "data:image/jpeg;base64,..." ou base64 puro. */
export function base64Puro(s: string) {
  const i = s.indexOf("base64,");
  return (i >= 0 ? s.slice(i + 7) : s).replace(/\s+/g, "");
}

// ─── Document Reader (OCR) ──────────────────────────────────

/** Códigos TextFieldType da Regula. */
const CAMPO = {
  DOCUMENT_NUMBER: 2,
  DATE_OF_EXPIRY: 3,
  DATE_OF_BIRTH: 5,
  PERSONAL_NUMBER: 7,
  SURNAME: 8,
  GIVEN_NAMES: 9,
  NATIONALITY: 11,
  SEX: 12,
  SURNAME_AND_GIVEN_NAMES: 25,
} as const;

const RESULT_STATUS = 33;
const RESULT_TEXT = 36;
const RESULT_IMAGES = 37;
const RESULT_DOCUMENT_TYPE = 9;
const GRAPHIC_PORTRAIT = 201;

/** CheckResult: 0 ERROR, 1 OK, 2 WAS_NOT_DONE. */
export type Verificado = "ok" | "erro" | "nao_feito";
function verificado(v: unknown): Verificado {
  return v === 1 ? "ok" : v === 0 ? "erro" : "nao_feito";
}

export interface ResultadoDocumento {
  transactionId: string;
  tipoDocumento?: string;
  campos: {
    apelido?: string;
    nomes?: string;
    nomeCompleto?: string;
    numeroDocumento?: string;
    numeroPessoal?: string;
    dataNascimento?: string; // YYYY-MM-DD
    dataValidade?: string; // YYYY-MM-DD
    nacionalidade?: string;
    sexo?: string;
  };
  estado: { geral: Verificado; optico: Verificado; validade: Verificado; texto: Verificado };
  /** Retrato impresso no documento (base64), usado no face match. */
  retrato?: string;
}

type ItemContainer = {
  result_type: number;
  Status?: { overallStatus?: number; optical?: number; detailsOptical?: { expiry?: number; text?: number } };
  Text?: { fieldList?: { fieldType: number; value?: string }[] };
  Images?: { fieldList?: { fieldType: number; valueList?: { source?: string; value?: string }[] }[] };
  OneCandidate?: { DocumentName?: string };
};

/** Datas da Regula vêm no formato do documento; normaliza para YYYY-MM-DD quando possível. */
export function normalizarData(v?: string): string | undefined {
  if (!v) return undefined;
  const s = v.trim();
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  m = s.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/);
  if (m) return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  return s;
}

export async function processarDocumento(frente: string, verso?: string, tag?: string): Promise<ResultadoDocumento> {
  if (SIMULADO) return documentoSimulado();

  const imagens = [frente, verso].filter(Boolean).map((img, page_idx) => ({ ImageData: { image: base64Puro(img!) }, light: 6, page_idx }));
  const r = await pedir<{ ContainerList?: { List?: ItemContainer[] }; TransactionInfo?: { TransactionID?: string } }>(DOCREADER_URL, "/api/process", {
    method: "POST",
    body: JSON.stringify({
      processParam: {
        scenario: "FullProcess",
        resultTypeOutput: [RESULT_STATUS, RESULT_TEXT, RESULT_IMAGES, RESULT_DOCUMENT_TYPE],
        alreadyCropped: false,
      },
      List: imagens,
      ...(tag ? { tag } : {}),
      ...(DOCREADER_LICENCA ? { systemInfo: { license: DOCREADER_LICENCA } } : {}),
    }),
  });

  const lista = r.ContainerList?.List ?? [];
  const status = lista.find((i) => i.result_type === RESULT_STATUS)?.Status;
  const campos = lista.find((i) => i.result_type === RESULT_TEXT)?.Text?.fieldList ?? [];
  const valor = (tipo: number) => campos.find((c) => c.fieldType === tipo)?.value?.trim() || undefined;
  const retratos = lista.find((i) => i.result_type === RESULT_IMAGES)?.Images?.fieldList?.find((f) => f.fieldType === GRAPHIC_PORTRAIT)?.valueList ?? [];
  const retrato = (retratos.find((v) => v.source === "VISUAL") ?? retratos[0])?.value;

  const apelido = valor(CAMPO.SURNAME);
  const nomes = valor(CAMPO.GIVEN_NAMES);
  return {
    transactionId: r.TransactionInfo?.TransactionID ?? "",
    tipoDocumento: lista.find((i) => i.result_type === RESULT_DOCUMENT_TYPE)?.OneCandidate?.DocumentName,
    campos: {
      apelido,
      nomes,
      nomeCompleto: [nomes, apelido].filter(Boolean).join(" ") || valor(CAMPO.SURNAME_AND_GIVEN_NAMES),
      numeroDocumento: valor(CAMPO.DOCUMENT_NUMBER),
      numeroPessoal: valor(CAMPO.PERSONAL_NUMBER),
      dataNascimento: normalizarData(valor(CAMPO.DATE_OF_BIRTH)),
      dataValidade: normalizarData(valor(CAMPO.DATE_OF_EXPIRY)),
      nacionalidade: valor(CAMPO.NATIONALITY),
      sexo: valor(CAMPO.SEX),
    },
    estado: {
      geral: verificado(status?.overallStatus),
      optico: verificado(status?.optical),
      validade: verificado(status?.detailsOptical?.expiry),
      texto: verificado(status?.detailsOptical?.text),
    },
    retrato: retrato ? base64Puro(retrato) : undefined,
  };
}

// ─── Face API: liveness ─────────────────────────────────────

export interface ResultadoLiveness {
  transactionId: string;
  aprovado: boolean;
  codigo: number;
  idadeEstimada?: number;
  /** Ligação para a selfie capturada (pode ser relativa ao servidor da Face API). */
  retratoUrl?: string;
}

export async function obterLiveness(transactionId: string): Promise<ResultadoLiveness> {
  if (SIMULADO) return { transactionId, aprovado: true, codigo: 0, idadeEstimada: 22 };
  const r = await pedir<{ code?: number; status?: number | null; age?: { low?: number; high?: number }[] | number[]; portrait?: string }>(
    FACEAPI_URL,
    `/api/v2/liveness?transactionId=${encodeURIComponent(transactionId)}`,
  );
  // status: 0 = liveness confirmado, 1 = não confirmado
  const idade = Array.isArray(r.age) && r.age.length ? r.age[0] : undefined;
  const idadeEstimada =
    typeof idade === "number" ? idade : idade && typeof idade === "object" && idade.low != null && idade.high != null ? Math.round((idade.low + idade.high) / 2) : undefined;
  return {
    transactionId,
    aprovado: (r.code ?? 0) === 0 && r.status === 0,
    codigo: r.code ?? -1,
    idadeEstimada,
    retratoUrl: r.portrait || undefined,
  };
}

/** Descarrega a selfie da transacção de liveness (base64), se a Face API a disponibilizar. */
async function retratoLiveness(url?: string): Promise<string | undefined> {
  if (!url) return undefined;
  const abs = /^https?:\/\//i.test(url) ? url : `${FACEAPI_URL}${url.startsWith("/") ? "" : "/"}${url}`;
  try {
    const res = await fetch(abs, { cache: "no-store", signal: AbortSignal.timeout(TIMEOUT_MS), headers: AUTORIZACAO ? { Authorization: AUTORIZACAO } : {} });
    if (!res.ok) return undefined;
    return Buffer.from(await res.arrayBuffer()).toString("base64");
  } catch {
    return undefined;
  }
}

// ─── Face API: face match ───────────────────────────────────

export interface ResultadoMatch {
  transactionId?: string;
  similaridade: number; // 0–100
  codigo: number;
}

/** Fonte da imagem (ImageSource): 1 documento impresso, 3 captura ao vivo. */
const FONTE_DOCUMENTO = 1;
const FONTE_LIVE = 3;

export async function compararRostos(retratoDocumento: string, liveness: ResultadoLiveness): Promise<ResultadoMatch> {
  if (SIMULADO) return { similaridade: 92.5, codigo: 0 };

  const selfie = await retratoLiveness(liveness.retratoUrl);
  const imagemLive = selfie
    ? { index: 1, type: FONTE_LIVE, data: selfie }
    : // sem acesso à selfie: a Face API aceita o transactionId do liveness no lugar da imagem
      { index: 1, type: FONTE_LIVE, livenessTransactionId: liveness.transactionId };

  const r = await pedir<{ code?: number; transactionId?: string; results?: { similarity?: number }[] }>(FACEAPI_URL, "/api/match", {
    method: "POST",
    body: JSON.stringify({ images: [{ index: 0, type: FONTE_DOCUMENTO, data: retratoDocumento }, imagemLive] }),
  });
  const similaridade = Math.max(0, ...(r.results ?? []).map((x) => Number(x.similarity) || 0));
  // a API pode devolver 0–1 ou 0–100 consoante a versão
  return { transactionId: r.transactionId, similaridade: similaridade <= 1 ? similaridade * 100 : similaridade, codigo: r.code ?? -1 };
}

// ─── Simulação ──────────────────────────────────────────────

function documentoSimulado(): ResultadoDocumento {
  const ano = new Date().getFullYear();
  return {
    transactionId: `sim-${Date.now()}`,
    tipoDocumento: "Bilhete de Identidade (simulado)",
    campos: {
      numeroDocumento: `${String(randomInt(100000000, 999999999))}${String(randomInt(100, 999))}${"ABCDEFGHJKLMNPQRSTUVWXYZ"[randomInt(24)]}`,
      dataNascimento: "2003-06-15",
      dataValidade: `${ano + 5}-12-31`,
      nacionalidade: "MOZ",
    },
    estado: { geral: "ok", optico: "ok", validade: "ok", texto: "ok" },
    retrato: "simulado",
  };
}
