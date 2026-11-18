import Link from "next/link";
import { notFound } from "next/navigation";
import { iniciarCandidaturaAction } from "@/app/actions/candidato";
import { CabecalhoPublico, RodapePublico } from "@/components/cabecalho-publico";
import { DetalhesBolsa } from "@/components/detalhes-bolsa";
import { BotaoSubmeter } from "@/components/formularios";
import { Aviso, Cabecalho, Distintivo } from "@/components/ui";
import { utilizadorActual } from "@/lib/auth";
import { listar, obter } from "@/lib/db";
import { TOM_ESTADO_BOLSA } from "@/lib/estilos";
import { fmt } from "@/lib/i18n";
import { obterI18n } from "@/lib/i18n/servidor";
import { dentroDoPrazo } from "@/lib/motor";
import type { Bolsa, Candidatura } from "@/lib/types";
import { latenciaPagina } from "@/lib/latencia";

export default async function PaginaBolsa({ params }: PageProps<"/scholarships/[id]">) {
  await latenciaPagina();
  const { id } = await params;
  const { t, f } = await obterI18n();
  const bolsa = await obter<Bolsa>("bolsas", id);
  if (!bolsa || bolsa.estado === "rascunho") notFound();
  const u = await utilizadorActual();
  const aberta = bolsa.estado === "aberta" && dentroDoPrazo(bolsa);
  const minha = u ? (await listar<Candidatura>("candidaturas")).find((c) => c.bolsaId === id && c.utilizadorId === u.id) : undefined;

  const estadoTxt = aberta ? t.estadoBolsa.aberta : bolsa.estado === "aberta" ? t.estadoBolsa.prazoEncerrado : t.estadoBolsa[bolsa.estado];

  return (
    <div className="flex min-h-screen flex-col">
      <CabecalhoPublico />
      <main className="mx-auto w-full max-w-[1280px] flex-1 px-4 py-8 sm:px-8">
        <Cabecalho
          voltar={{ href: u?.papel === "candidato" ? "/applicant/scholarships" : "/", rotulo: t.comum.voltar }}
          sobretitulo={`${bolsa.entidade} · ${t.bolsa.anoLectivo} ${bolsa.anoLectivo}`}
          titulo={bolsa.titulo}
          subtitulo={bolsa.descricao}
          accoes={
            <>
              <Distintivo tom={aberta ? "sucesso" : TOM_ESTADO_BOLSA[bolsa.estado]}>{estadoTxt}</Distintivo>
              {u?.papel === "candidato" && !minha && aberta && (
                <form action={iniciarCandidaturaAction}>
                  <input type="hidden" name="bolsaId" value={bolsa.id} />
                  <BotaoSubmeter pendente={t.candidatura.aCriar}>{t.candidatura.candidatar}</BotaoSubmeter>
                </form>
              )}
            </>
          }
        />

        <div className="mb-6 space-y-3">
          {!u && aberta && (
            <Aviso
              accao={
                <div className="flex gap-2">
                  <Link href={`/auth?redirect=/scholarships/${bolsa.id}`} className="btn-secundario btn-sm">
                    {t.publico.entrar}
                  </Link>
                  <Link href="/register" className="btn-primario btn-sm">
                    {t.publico.criarConta}
                  </Link>
                </div>
              }
            >
              {t.candidatura.loginParaCandidatar}
            </Aviso>
          )}
          {u?.papel === "candidato" && minha && (
            <Aviso
              tom="sucesso"
              accao={
                <Link href={`/applicant/applications/${minha.id}`} className="btn-secundario btn-sm">
                  {t.candidato.abrirCandidatura}
                </Link>
              }
            >
              {fmt(t.candidatura.jaTem, { codigo: minha.codigo })}
            </Aviso>
          )}
          {!aberta && !minha && <Aviso tom="aviso">{t.candidatura.naoRecebe}</Aviso>}
        </div>

        <DetalhesBolsa bolsa={bolsa} t={t} f={f} />
      </main>
      <RodapePublico />
    </div>
  );
}
