"use server";

import { esperar } from "@/lib/latencia";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { COOKIE_IDIOMA, idiomaValido } from "@/lib/i18n";

export async function definirIdioma(idioma: string) {
  await esperar();
  (await cookies()).set(COOKIE_IDIOMA, idiomaValido(idioma), {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
  revalidatePath("/", "layout");
}
