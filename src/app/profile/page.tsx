import type { Metadata } from "next";
import { Cabecalho, Cartao } from "@/components/ui";
import { exigirUtilizador } from "@/lib/auth";
import { obterI18n } from "@/lib/i18n/servidor";
import { FormularioPerfil, FormularioSenha } from "./formularios";
import { latenciaPagina } from "@/lib/latencia";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await obterI18n()).t.perfil.titulo };
}

export default async function Perfil() {
  await latenciaPagina();
  const u = await exigirUtilizador();
  const { t } = await obterI18n();
  return (
    <>
      <Cabecalho titulo={t.perfil.titulo} subtitulo={`${t.papel[u.papel]} · ${u.email}`} />
      <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <Cartao titulo={t.perfil.dadosPessoais}>
          <FormularioPerfil u={u} />
        </Cartao>
        <Cartao titulo={t.perfil.seguranca}>
          <FormularioSenha />
        </Cartao>
      </div>
    </>
  );
}
