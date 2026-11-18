"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { DICIONARIOS, formatadores, type Idioma } from "@/lib/i18n";

const Ctx = createContext<Idioma>("pt");

export function I18nProvider({ idioma, children }: { idioma: Idioma; children: ReactNode }) {
  return <Ctx.Provider value={idioma}>{children}</Ctx.Provider>;
}

/** Dicionário e formatadores no cliente. */
export function useI18n() {
  const idioma = useContext(Ctx);
  return useMemo(() => ({ idioma, t: DICIONARIOS[idioma], f: formatadores(idioma) }), [idioma]);
}
