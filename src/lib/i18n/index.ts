import { en } from "./en";
import { pt, type Dicionario } from "./pt";

export type Idioma = "pt" | "en";
export type { Dicionario };

export const IDIOMAS: { codigo: Idioma; rotulo: string; curto: string }[] = [
  { codigo: "pt", rotulo: "Português", curto: "PT" },
  { codigo: "en", rotulo: "English", curto: "EN" },
];

export const COOKIE_IDIOMA = "sadeb_idioma";
export const COOKIE_TEMA = "sadeb_tema";

export const DICIONARIOS: Record<Idioma, Dicionario> = { pt, en };

export function idiomaValido(v: string | undefined): Idioma {
  return v === "en" ? "en" : "pt";
}

/** Substitui {chaves} num texto. */
export function fmt(texto: string, vars: Record<string, string | number | undefined> = {}) {
  return texto.replace(/\{(\w+)\}/g, (_, k) => (vars[k] === undefined ? `{${k}}` : String(vars[k])));
}

const LOCALES: Record<Idioma, string> = { pt: "pt-PT", en: "en-GB" };

export function formatadores(idioma: Idioma) {
  const loc = LOCALES[idioma];
  return {
    data(iso?: string) {
      if (!iso) return "—";
      const d = iso.length === 10 ? new Date(`${iso}T12:00:00`) : new Date(iso);
      return d.toLocaleDateString(loc, { day: "2-digit", month: "short", year: "numeric" });
    },
    dataHora(iso?: string) {
      if (!iso) return "—";
      return new Date(iso).toLocaleString(loc, { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
    },
    numero(v: number, casas = 0) {
      return v.toLocaleString(loc, { minimumFractionDigits: casas, maximumFractionDigits: casas });
    },
    mzn(v: number) {
      return `${v.toLocaleString(loc)} MZN`;
    },
  };
}
export type Formatadores = ReturnType<typeof formatadores>;
