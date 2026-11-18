import type { Metadata } from "next";
import { PaginaAuth } from "@/components/pagina-auth";
import { obterI18n } from "@/lib/i18n/servidor";
import { latenciaPagina } from "@/lib/latencia";
import { FormularioRecuperar } from "./formulario";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await obterI18n()).t.auth.recuperarT };
}

export default async function RecuperarSenha() {
  await latenciaPagina();
  const { t } = await obterI18n();
  return (
    <PaginaAuth titulo={t.auth.recuperarT} instrucoes={t.auth.recuperarInstr}>
      <FormularioRecuperar />
    </PaginaAuth>
  );
}
