import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { CabecalhoPublico, RodapePublico } from "@/components/cabecalho-publico";
import { Vazio } from "@/components/ui";
import { listar } from "@/lib/db";
import { obterI18n } from "@/lib/i18n/servidor";
import { dentroDoPrazo } from "@/lib/motor";
import type { Bolsa } from "@/lib/types";
import { latenciaPagina } from "@/lib/latencia";

export default async function Inicio() {
  await latenciaPagina();
  const { t, f } = await obterI18n();
  const p = t.publico;
  const abertas = (await listar<Bolsa>("bolsas"))
    .filter((b) => b.estado === "aberta" && dentroDoPrazo(b))
    .sort((a, b) => a.dataEncerramento.localeCompare(b.dataEncerramento));
  const vagas = abertas.reduce((s, b) => s + b.vagas, 0);
  const fases = [t.fases.f1, t.fases.f2, t.fases.f3, t.fases.f4, t.fases.f5];

  return (
    <div className="flex min-h-screen flex-col">
      <CabecalhoPublico />

      <section className="border-b border-line bg-surface">
        <div className="mx-auto grid max-w-[1280px] gap-10 px-4 py-14 sm:px-8 lg:grid-cols-[1.6fr_1fr] lg:items-end lg:py-20">
          <div>
            <p className="flex items-center gap-2 font-mono text-xs tracking-[0.14em] text-accent uppercase">
              <span className="h-px w-8 bg-accent" />
              {p.eyebrow}
            </p>
            <h1 className="mt-4 max-w-2xl text-4xl leading-[1.1] font-semibold tracking-tight text-fg sm:text-5xl">{p.titulo}</h1>
            <p className="mt-5 max-w-2xl text-base leading-relaxed text-muted">{p.subtitulo}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/register" className="btn-primario h-11 px-6">
                {p.criarConta}
                <ArrowRight className="size-4" />
              </Link>
              <Link href="/auth" className="btn-secundario h-11 px-6">
                {p.entrar}
              </Link>
            </div>
          </div>
          <dl className="grid grid-cols-3 border border-line lg:grid-cols-1">
            {[
              [p.concursosAbertos, abertas.length],
              [p.vagasDisponiveis, vagas],
              [p.proximoPrazo, abertas[0] ? f.data(abertas[0].dataEncerramento) : "—"],
            ].map(([k, v], i) => (
              <div key={String(k)} className={`px-5 py-4 ${i ? "border-l border-line lg:border-t lg:border-l-0" : ""}`}>
                <dt className="text-[11px] font-semibold tracking-wider text-subtle uppercase">{k}</dt>
                <dd className="mt-1 text-xl font-semibold text-fg tabular-nums sm:text-2xl">{v}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section className="mx-auto w-full max-w-[1280px] px-4 py-12 sm:px-8">
        <h2 className="mb-4 text-lg font-semibold text-fg">{p.listaConcursos}</h2>
        <div className="cartao">
          {abertas.length === 0 ? (
            <Vazio titulo={p.semConcursos} />
          ) : (
            <div className="overflow-x-auto">
              <table className="tabela">
                <thead>
                  <tr>
                    <th>{p.colConcurso}</th>
                    <th>{p.colEntidade}</th>
                    <th className="text-right">{p.colVagas}</th>
                    <th>{p.colPrazo}</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {abertas.map((b) => (
                    <tr key={b.id}>
                      <td>
                        <Link href={`/scholarships/${b.id}`} className="font-medium text-fg hover:text-primary">
                          {b.titulo}
                        </Link>
                        <p className="mt-0.5 line-clamp-1 max-w-xl text-xs text-muted">{b.descricao}</p>
                      </td>
                      <td className="text-muted">{b.entidade}</td>
                      <td className="text-right font-mono tabular-nums">{b.vagas}</td>
                      <td className="whitespace-nowrap">{f.data(b.dataEncerramento)}</td>
                      <td className="text-right">
                        <Link href={`/scholarships/${b.id}`} className="btn-secundario btn-sm">
                          {p.consultar}
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      <section className="border-t border-line bg-surface">
        <div className="mx-auto max-w-[1280px] px-4 py-12 sm:px-8">
          <h2 className="mb-6 text-lg font-semibold text-fg">{t.fases.titulo}</h2>
          <ol className="grid border border-line md:grid-cols-5">
            {fases.map((fase, i) => (
              <li key={fase.t} className={`px-5 py-5 ${i ? "border-t border-line md:border-t-0 md:border-l" : ""}`}>
                <span className="font-mono text-xs font-semibold text-accent">{String(i + 1).padStart(2, "0")}</span>
                <h3 className="mt-2 text-sm font-semibold text-fg">{fase.t}</h3>
                <p className="mt-1 text-sm leading-relaxed text-muted">{fase.d}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <RodapePublico />
    </div>
  );
}
