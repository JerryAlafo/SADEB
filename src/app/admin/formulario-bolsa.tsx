"use client";

import { useActionState, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { guardarBolsaAction } from "@/app/actions/admin";
import { CaixaSeleccao, CampoAreaTexto, CampoTexto } from "@/components/campos";
import { BotaoSubmeter, EstadoMensagem, Formulario } from "@/components/formularios";
import { useI18n } from "@/components/i18n-provider";
import { fmt } from "@/lib/i18n";
import { CAMPOS } from "@/lib/motor";
import type { Bolsa, CampoCriterio, Criterio, SentidoCriterio } from "@/lib/types";
import { cn } from "@/lib/utils";

const COMPACTO =
  "h-9 w-full rounded-md border border-line-strong bg-transparent px-2.5 text-sm text-fg outline-none transition-colors hover:border-subtle focus-visible:border-primary disabled:opacity-40";

function Seccao({ titulo, children, accoes }: { titulo: string; children: React.ReactNode; accoes?: React.ReactNode }) {
  return (
    <section className="border-t border-line pt-6 first:border-t-0 first:pt-0">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-[11px] font-semibold tracking-wider text-muted uppercase">{titulo}</h3>
        {accoes}
      </div>
      {children}
    </section>
  );
}

export function FormularioBolsa({ bolsa, areas, criteriosIniciais, documentosIniciais }: { bolsa?: Bolsa; areas: string[]; criteriosIniciais: Criterio[]; documentosIniciais: string[] }) {
  const { t } = useI18n();
  const a = t.admin;
  const [estado, accao, pendente] = useActionState(guardarBolsaAction, undefined);
  const [criterios, setCriterios] = useState<Criterio[]>(criteriosIniciais);
  const soma = criterios.reduce((s, c) => s + (Number(c.peso) || 0), 0);
  const somaOk = Math.abs(soma - 100) < 0.001;
  const r = bolsa?.requisitos;
  const mudar = (i: number, p: Partial<Criterio>) => setCriterios((cs) => cs.map((c, j) => (j === i ? { ...c, ...p } : c)));

  return (
    <Formulario accao={accao} pendente={pendente} className="space-y-6">
      {bolsa && <input type="hidden" name="id" value={bolsa.id} />}
      <input type="hidden" name="criterios" value={JSON.stringify(criterios)} />

      <Seccao titulo={a.secIdent}>
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <CampoTexto name="titulo" label={a.titulo} defaultValue={bolsa?.titulo} required />
          </div>
          <div className="sm:col-span-2">
            <CampoAreaTexto name="descricao" label={a.descricao} rows={3} defaultValue={bolsa?.descricao} />
          </div>
          <CampoTexto name="entidade" label={a.entidade} defaultValue={bolsa?.entidade ?? t.app.instituicao} />
          <CampoTexto name="anoLectivo" label={a.anoLectivo} defaultValue={bolsa?.anoLectivo ?? String(new Date().getFullYear() + 1)} />
          <CampoTexto name="dataAbertura" type="date" label={a.abertura} defaultValue={bolsa?.dataAbertura} required />
          <CampoTexto name="dataEncerramento" type="date" label={a.encerramento} defaultValue={bolsa?.dataEncerramento} required />
          <CampoTexto name="vagas" type="number" min={1} label={a.vagas} defaultValue={bolsa?.vagas ?? 5} required />
          <CampoTexto name="vagasListaEspera" type="number" min={0} label={a.listaEspera} defaultValue={bolsa?.vagasListaEspera ?? 5} />
        </div>
      </Seccao>

      <Seccao titulo={a.secRequisitos}>
        <div className="grid gap-5 sm:grid-cols-3">
          <CampoTexto name="mediaMinima" type="number" step="0.1" min={0} max={20} label={a.mediaMinima} defaultValue={r?.mediaMinima ?? 12} />
          <CampoTexto name="rendimentoPerCapitaMax" type="number" min={0} label={a.rendMax} defaultValue={r?.rendimentoPerCapitaMax ?? 15000} />
          <CampoTexto name="idadeMaxima" type="number" min={0} label={a.idadeMax} defaultValue={r?.idadeMaxima ?? 30} />
        </div>
        <div className="mt-5 rounded-md border border-line p-4">
          <p className="mb-3 text-sm font-medium text-fg">
            {a.areas} <span className="font-normal text-subtle">— {a.areasAjuda}</span>
          </p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {areas.map((ar) => (
              <CaixaSeleccao key={ar} name="areas" value={ar} defaultChecked={r?.areasElegiveis.includes(ar)} label={ar} />
            ))}
          </div>
        </div>
        <div className="mt-5">
          <CampoAreaTexto name="documentos" label={a.documentos} rows={4} defaultValue={documentosIniciais.join("\n")} className="font-mono text-xs" />
        </div>
      </Seccao>

      <Seccao
        titulo={a.secCriterios}
        accoes={
          <span className={cn("inline-flex h-6 items-center rounded-sm border px-2 font-mono text-xs font-medium", somaOk ? "border-success/30 bg-success-soft text-success" : "border-danger/30 bg-danger-soft text-danger")}>
            {fmt(a.somaPesos, { s: soma })}
            {!somaOk && ` — ${a.deveSer100}`}
          </span>
        }
      >
        <div className="overflow-x-auto rounded-md border border-line">
          <table className="tabela">
            <thead>
              <tr>
                <th className="min-w-52">{a.colNome}</th>
                <th className="min-w-48">{a.colDado}</th>
                <th className="min-w-40">{a.colSentido}</th>
                <th className="w-24">{a.colPeso}</th>
                <th className="w-24">{a.colMin}</th>
                <th className="w-24">{a.colMax}</th>
                <th className="w-12" />
              </tr>
            </thead>
            <tbody>
              {criterios.map((c, i) => (
                <tr key={c.id}>
                  <td>
                    <input value={c.nome} onChange={(e) => mudar(i, { nome: e.target.value })} className={COMPACTO} aria-label={a.colNome} />
                  </td>
                  <td>
                    <select value={c.campo} onChange={(e) => mudar(i, { campo: e.target.value as CampoCriterio })} className={cn(COMPACTO, "bg-surface")} aria-label={a.colDado}>
                      {CAMPOS.map((k) => (
                        <option key={k} value={k}>
                          {t.campos[k]}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <select value={c.sentido} onChange={(e) => mudar(i, { sentido: e.target.value as SentidoCriterio })} className={cn(COMPACTO, "bg-surface")} aria-label={a.colSentido}>
                      <option value="maior_melhor">{a.sentidoMaior}</option>
                      <option value="menor_melhor">{a.sentidoMenor}</option>
                      <option value="booleano">{a.sentidoBool}</option>
                    </select>
                  </td>
                  <td>
                    <input type="number" min={0} max={100} value={c.peso} onChange={(e) => mudar(i, { peso: Number(e.target.value) })} className={cn(COMPACTO, "font-mono")} aria-label={a.colPeso} />
                  </td>
                  <td>
                    <input type="number" value={c.min} disabled={c.sentido === "booleano"} onChange={(e) => mudar(i, { min: Number(e.target.value) })} className={cn(COMPACTO, "font-mono")} aria-label={a.colMin} />
                  </td>
                  <td>
                    <input type="number" value={c.max} disabled={c.sentido === "booleano"} onChange={(e) => mudar(i, { max: Number(e.target.value) })} className={cn(COMPACTO, "font-mono")} aria-label={a.colMax} />
                  </td>
                  <td>
                    <button type="button" onClick={() => setCriterios((cs) => cs.filter((_, j) => j !== i))} className="btn-fantasma btn-sm px-2 text-danger hover:bg-danger-soft" aria-label={t.candidatura.remover}>
                      <Trash2 className="size-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
          <p className="max-w-2xl text-xs text-subtle">{a.criteriosAjuda}</p>
          <button
            type="button"
            className="btn-secundario btn-sm"
            onClick={() => setCriterios((cs) => [...cs, { id: crypto.randomUUID(), nome: a.novoCriterio, campo: "media", sentido: "maior_melhor", peso: 0, min: 0, max: 20 }])}
          >
            <Plus className="size-3.5" />
            {a.adicionarCriterio}
          </button>
        </div>
      </Seccao>

      {!bolsa && (
        <div className="border-t border-line pt-6">
          <CaixaSeleccao name="estado" value="aberta" defaultChecked label={a.publicarJa} />
        </div>
      )}

      <EstadoMensagem estado={estado} />
      <div className="flex justify-end border-t border-line pt-5">
        <BotaoSubmeter pendente={t.comum.aGuardar}>{bolsa ? a.guardarAlteracoes : a.criar}</BotaoSubmeter>
      </div>
    </Formulario>
  );
}
