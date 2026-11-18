import type { Metadata } from "next";
import { PaginaAuth } from "@/components/pagina-auth";
import { obterI18n } from "@/lib/i18n/servidor";
import { configuracaoPublica } from "@/lib/regula";
import { publica, VERIFICACAO_OBRIGATORIA, verificacaoActual } from "@/lib/verificacao";
import { FormularioRegisto } from "./formulario";
import { VerificacaoIdentidade } from "./verificacao";
import { latenciaPagina } from "@/lib/latencia";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await obterI18n()).t.auth.tituloRegistar };
}

export default async function Registar() {
  await latenciaPagina();
  const { t } = await obterI18n();

  if (!VERIFICACAO_OBRIGATORIA) {
    return (
      <PaginaAuth titulo={t.auth.tituloRegistar} instrucoes={t.auth.instrucoesRegistar} largura="max-w-2xl">
        <FormularioRegisto />
      </PaginaAuth>
    );
  }

  const v = await verificacaoActual();
  return (
    <PaginaAuth titulo={t.verificacao.titulo} instrucoes={t.verificacao.intro} largura="max-w-2xl">
      <VerificacaoIdentidade inicial={v ? publica(v) : null} config={configuracaoPublica()} />
    </PaginaAuth>
  );
}
