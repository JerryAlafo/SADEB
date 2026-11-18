import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { TabelaCandidaturasCandidato } from "@/components/lista-candidaturas";
import { Aviso, Cabecalho, Cartao, Indicador, Vazio } from "@/components/ui";
import { exigirUtilizador } from "@/lib/auth";
import { listar } from "@/lib/db";
import { fmt } from "@/lib/i18n";
import { obterI18n } from "@/lib/i18n/servidor";
import { dentroDoPrazo } from "@/lib/motor";
import { textoNotificacao, textoPendencia } from "@/lib/textos";
import type { Bolsa, Candidatura, Notificacao } from "@/lib/types";
import { cn } from "@/lib/utils";
import { latenciaPagina } from "@/lib/latencia";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await obterI18n()).t.candidato.painel };
}

export default async function PainelCandidato() {
  await latenciaPagina();
  const u = await exigirUtilizador("candidato");
  const { t, f } = await obterI18n();
  const c = t.candidato;
  const [bolsas, todas, notifs] = await Promise.all([listar<Bolsa>("bolsas"), listar<Candidatura>("candidaturas"), listar<Notificacao>("notificacoes")]);
  const minhas = todas.filter((x) => x.utilizadorId === u.id).sort((a, b) => b.actualizadaEm.localeCompare(a.actualizadaEm));
  const abertas = bolsas.filter((b) => b.estado === "aberta" && dentroDoPrazo(b));
  const porCandidatar = abertas.filter((b) => !minhas.some((x) => x.bolsaId === b.id));
  const recentes = notifs.filter((n) => n.utilizadorId === u.id).sort((a, b) => b.criadaEm.localeCompare(a.criadaEm)).slice(0, 5);
  const pendentes = minhas.filter((x) => x.estado === "rascunho" || x.estado === "correcao_solicitada");

  return (
    <>
      <Cabecalho titulo={c.painel} subtitulo={fmt(c.boasVindas, { nome: u.nome })} />

      {(pendentes.length > 0 || !u.dataNascimento) && (
        <div className="mb-6 space-y-3">
          {!u.dataNascimento && (
            <Aviso tom="aviso" titulo={c.perfilIncompletoT} accao={<Link href="/profile" className="btn-secundario btn-sm">{c.irPerfil}</Link>}>
              {c.perfilIncompletoD}
            </Aviso>
          )}
          {pendentes.map((x) => (
            <Aviso
              key={x.id}
              tom={x.estado === "correcao_solicitada" ? "aviso" : "info"}
              titulo={fmt(x.estado === "correcao_solicitada" ? c.correcaoT : c.rascunhoT, { codigo: x.codigo })}
              accao={<Link href={`/applicant/applications/${x.id}`} className="btn-secundario btn-sm">{c.continuar}</Link>}
            >
              {x.estado === "correcao_solicitada" ? x.pendencias.map((p) => textoPendencia(t, p)).join("; ") : c.rascunhoD}
            </Aviso>
          ))}
        </div>
      )}

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Indicador rotulo={c.kCandidaturas} valor={minhas.length} tom="primario" />
        <Indicador rotulo={c.kEmAvaliacao} valor={minhas.filter((x) => ["elegivel", "classificada"].includes(x.estado)).length} tom="info" />
        <Indicador rotulo={c.kAtribuidas} valor={minhas.filter((x) => x.estado === "decidida" && x.resultadoFinal === "seleccionado").length} tom="sucesso" />
        <Indicador rotulo={c.kConcursos} valor={abertas.length} tom="destaque" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <Cartao titulo={c.minhas} accoes={<Link href="/applicant/applications" className="text-xs font-medium text-primary hover:underline">{t.comum.verTodas}</Link>} corpo="">
          {minhas.length ? <TabelaCandidaturasCandidato candidaturas={minhas.slice(0, 6)} bolsas={bolsas} t={t} f={f} /> : <Vazio titulo={c.semCandidaturas} />}
        </Cartao>

        <div className="space-y-6">
          <Cartao titulo={c.disponiveis} corpo="">
            {porCandidatar.length ? (
              <ul className="divide-y divide-line">
                {porCandidatar.map((b) => (
                  <li key={b.id}>
                    <Link href={`/scholarships/${b.id}`} className="group flex items-center justify-between gap-3 px-5 py-3 hover:bg-surface-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-fg group-hover:text-primary">{b.titulo}</p>
                        <p className="text-xs text-muted">
                          {fmt(t.comum.ate, { data: f.data(b.dataEncerramento) })} · {fmt(t.comissao.vagasN, { n: b.vagas })}
                        </p>
                      </div>
                      <ChevronRight className="size-4 shrink-0 text-subtle group-hover:text-primary" />
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="px-5 py-4 text-sm text-muted">{c.semDisponiveis}</p>
            )}
          </Cartao>

          <Cartao titulo={c.notifRecentes} accoes={<Link href="/notifications" className="text-xs font-medium text-primary hover:underline">{t.comum.verTodas}</Link>} corpo="">
            {recentes.length ? (
              <ul className="divide-y divide-line">
                {recentes.map((n) => {
                  const { titulo, mensagem } = textoNotificacao(t, n);
                  return (
                    <li key={n.id} className="px-5 py-3">
                      <p className={cn("flex items-center gap-2 text-sm", n.lida ? "text-muted" : "font-medium text-fg")}>
                        {!n.lida && <span className="size-1.5 shrink-0 bg-primary" />}
                        {titulo}
                      </p>
                      <p className="mt-0.5 line-clamp-2 text-xs text-muted">{mensagem}</p>
                      <p className="mt-1 font-mono text-[11px] text-subtle">{f.dataHora(n.criadaEm)}</p>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="px-5 py-4 text-sm text-muted">{c.semNotif}</p>
            )}
          </Cartao>
        </div>
      </div>
    </>
  );
}
