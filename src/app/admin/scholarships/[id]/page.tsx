import Link from "next/link";
import { notFound } from "next/navigation";
import { alterarEstadoBolsaAction } from "@/app/actions/admin";
import { DetalhesBolsa } from "@/components/detalhes-bolsa";
import { BotaoSubmeter } from "@/components/formularios";
import { Aviso, Cabecalho, Cartao, Distintivo } from "@/components/ui";
import { listar, obter } from "@/lib/db";
import { TOM_ESTADO_BOLSA } from "@/lib/estilos";
import { fmt } from "@/lib/i18n";
import { obterI18n } from "@/lib/i18n/servidor";
import { AREAS_ESTUDO } from "@/lib/padroes";
import type { Bolsa, Candidatura } from "@/lib/types";
import { FormularioBolsa } from "../../formulario-bolsa";
import { latenciaPagina } from "@/lib/latencia";

export default async function EditarConcurso({ params }: PageProps<"/admin/scholarships/[id]">) {
  await latenciaPagina();
  const { id } = await params;
  const { t, f } = await obterI18n();
  const a = t.admin;
  const bolsa = await obter<Bolsa>("bolsas", id);
  if (!bolsa) notFound();
  const submetidas = (await listar<Candidatura>("candidaturas")).filter((c) => c.bolsaId === id && c.estado !== "rascunho").length;
  const bloqueada = bolsa.estado === "em_avaliacao" || bolsa.estado === "concluida";
  const areas = [...new Set([...AREAS_ESTUDO, ...bolsa.requisitos.areasElegiveis])];

  return (
    <>
      <Cabecalho
        voltar={{ href: "/admin/scholarships", rotulo: a.concursosT }}
        sobretitulo={fmt(a.submetidasN, { n: submetidas })}
        titulo={bolsa.titulo}
        accoes={
          <>
            <Distintivo tom={TOM_ESTADO_BOLSA[bolsa.estado]}>{t.estadoBolsa[bolsa.estado]}</Distintivo>
            {bolsa.estado !== "rascunho" && (
              <Link href={`/committee/scholarships/${bolsa.id}`} className="btn-secundario">
                {a.verAvaliacao}
              </Link>
            )}
            {(bolsa.estado === "rascunho" || bolsa.estado === "aberta") && (
              <form action={alterarEstadoBolsaAction}>
                <input type="hidden" name="id" value={bolsa.id} />
                <input type="hidden" name="estado" value={bolsa.estado === "rascunho" ? "aberta" : "rascunho"} />
                <BotaoSubmeter className={bolsa.estado === "rascunho" ? "btn-sucesso" : "btn-secundario"}>{bolsa.estado === "rascunho" ? a.publicar : a.retirar}</BotaoSubmeter>
              </form>
            )}
          </>
        }
      />

      {bloqueada ? (
        <div className="space-y-6">
          <Aviso titulo={a.bloqueadaT}>{a.bloqueadaD}</Aviso>
          <DetalhesBolsa bolsa={bolsa} t={t} f={f} />
        </div>
      ) : (
        <div className="space-y-6">
          {submetidas > 0 && (
            <Aviso tom="aviso" titulo={a.atencaoT}>
              {a.atencaoD}
            </Aviso>
          )}
          <Cartao>
            <FormularioBolsa bolsa={bolsa} areas={areas} criteriosIniciais={bolsa.criterios} documentosIniciais={bolsa.documentosObrigatorios} />
          </Cartao>
        </div>
      )}
    </>
  );
}
