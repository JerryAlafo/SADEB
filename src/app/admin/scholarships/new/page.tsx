import type { Metadata } from "next";
import { Cabecalho, Cartao } from "@/components/ui";
import { obterI18n } from "@/lib/i18n/servidor";
import { AREAS_ESTUDO, criteriosPadrao, DOCUMENTOS_PADRAO } from "@/lib/padroes";
import { FormularioBolsa } from "../../formulario-bolsa";
import { latenciaPagina } from "@/lib/latencia";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await obterI18n()).t.admin.novoT };
}

export default async function NovoConcurso() {
  await latenciaPagina();
  const { t } = await obterI18n();
  return (
    <>
      <Cabecalho voltar={{ href: "/admin/scholarships", rotulo: t.admin.concursosT }} titulo={t.admin.novoT} subtitulo={t.admin.novoD} />
      <Cartao>
        <FormularioBolsa areas={AREAS_ESTUDO} criteriosIniciais={criteriosPadrao()} documentosIniciais={DOCUMENTOS_PADRAO} />
      </Cartao>
    </>
  );
}
