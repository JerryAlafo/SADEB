import { cookies } from "next/headers";
import { cache } from "react";
import { COOKIE_IDIOMA, COOKIE_TEMA, DICIONARIOS, formatadores, idiomaValido } from "./index";

/** Idioma, dicionário e formatadores do pedido actual. */
export const obterI18n = cache(async () => {
  const store = await cookies();
  const idioma = idiomaValido(store.get(COOKIE_IDIOMA)?.value);
  return { idioma, t: DICIONARIOS[idioma], f: formatadores(idioma) };
});

export async function obterTema(): Promise<"light" | "dark" | undefined> {
  const v = (await cookies()).get(COOKIE_TEMA)?.value;
  return v === "dark" || v === "light" ? v : undefined;
}
