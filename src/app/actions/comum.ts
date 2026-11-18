import { revalidatePath } from "next/cache";
import { fmt } from "@/lib/i18n";
import { obterI18n } from "@/lib/i18n/servidor";
import { ErroNegocio } from "@/lib/servicos";

export type EstadoForm = { erro?: string; ok?: string; erros?: string[] } | undefined;

export function txt(fd: FormData, k: string) {
  return String(fd.get(k) ?? "").trim();
}

export function num(fd: FormData, k: string) {
  const v = Number(txt(fd, k).replace(",", "."));
  return Number.isFinite(v) ? v : 0;
}

export function bool(fd: FormData, k: string) {
  const v = fd.get(k);
  return v === "on" || v === "true" || v === "1";
}

export function refrescar() {
  revalidatePath("/", "layout");
}

/** Converte erros de negócio em mensagens no idioma actual; relança os restantes (incl. redirect). */
export async function tratarErro(e: unknown): Promise<EstadoForm> {
  if (e instanceof ErroNegocio) {
    const { t } = await obterI18n();
    return { erro: fmt(t.erros[e.chave], e.params) };
  }
  throw e;
}
