import type { Metadata } from "next";
import { PaginaAuth } from "@/components/pagina-auth";
import { obterI18n } from "@/lib/i18n/servidor";
import { latenciaPagina } from "@/lib/latencia";
import { FormularioRedefinir } from "./formulario";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await obterI18n()).t.auth.redefinirT };
}

export default async function RedefinirSenha({ searchParams }: PageProps<"/reset-password">) {
  await latenciaPagina();
  const { t } = await obterI18n();
  const { token } = await searchParams;
  return (
    <PaginaAuth titulo={t.auth.redefinirT} instrucoes={t.auth.redefinirInstr}>
      <FormularioRedefinir token={typeof token === "string" ? token : ""} />
    </PaginaAuth>
  );
}
