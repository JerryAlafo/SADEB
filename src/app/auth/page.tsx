import type { Metadata } from "next";
import { PaginaAuth } from "@/components/pagina-auth";
import { obterI18n } from "@/lib/i18n/servidor";
import { FormularioEntrar } from "./formulario";
import { latenciaPagina } from "@/lib/latencia";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await obterI18n()).t.auth.tituloEntrar };
}

export default async function Entrar({ searchParams }: PageProps<"/auth">) {
  await latenciaPagina();
  const { t } = await obterI18n();
  const { redirect } = await searchParams;
  return (
    <PaginaAuth titulo={t.auth.tituloEntrar} instrucoes={t.auth.instrucoesEntrar}>
      <FormularioEntrar destino={typeof redirect === "string" ? redirect : undefined} />
    </PaginaAuth>
  );
}
