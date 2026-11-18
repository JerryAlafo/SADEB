"use client";

import { useActionState, useEffect, useRef } from "react";
import { Upload } from "lucide-react";
import { carregarDocumentoAction, guardarCandidaturaAction } from "@/app/actions/candidato";
import { CaixaSeleccao, CampoAreaTexto, CampoFicheiro, CampoSelect, CampoTexto } from "@/components/campos";
import { BotaoSubmeter, EstadoMensagem, Formulario } from "@/components/formularios";
import { useI18n } from "@/components/i18n-provider";
import type { DadosCandidatura } from "@/lib/types";

function Seccao({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <fieldset className="border-t border-line pt-5 first:border-t-0 first:pt-0">
      <legend className="mb-5 text-[11px] font-semibold tracking-wider text-muted uppercase">{titulo}</legend>
      <div className="grid gap-5 sm:grid-cols-2">{children}</div>
    </fieldset>
  );
}

export function FormularioDados({ id, dados, areas }: { id: string; dados: DadosCandidatura; areas: string[] }) {
  const { t } = useI18n();
  const c = t.candidatura;
  const [estado, accao, pendente] = useActionState(guardarCandidaturaAction, undefined);
  return (
    <Formulario accao={accao} pendente={pendente} className="space-y-6">
      <input type="hidden" name="id" value={id} />

      <Seccao titulo={c.secAcademica}>
        <CampoTexto name="instituicao" label={c.instituicao} defaultValue={dados.instituicao || t.app.instituicao} required />
        <CampoTexto name="curso" label={c.curso} defaultValue={dados.curso} required />
        <CampoSelect name="area" label={c.area} defaultValue={dados.area} options={areas.map((a) => ({ label: a, value: a }))} required />
        <div className="grid grid-cols-2 gap-5">
          <CampoTexto name="anoFrequencia" type="number" min={1} max={7} label={c.anoFrequencia} defaultValue={dados.anoFrequencia} required />
          <CampoTexto name="media" type="number" step="0.1" min={0} max={20} label={c.media} defaultValue={dados.media || ""} required />
        </div>
      </Seccao>

      <Seccao titulo={c.secSocio}>
        <CampoTexto name="rendimentoFamiliar" type="number" min={0} label={c.rendimento} defaultValue={dados.rendimentoFamiliar || ""} required />
        <CampoTexto name="agregadoFamiliar" type="number" min={1} max={30} label={c.agregado} defaultValue={dados.agregadoFamiliar} required />
        <CampoTexto name="distanciaKm" type="number" min={0} label={c.distancia} defaultValue={dados.distanciaKm || ""} />
        <CampoSelect name="actividadesExtra" label={c.actividades} defaultValue={String(dados.actividadesExtra)} options={c.act.map((l, i) => ({ label: l, value: String(i) }))} />
        <CaixaSeleccao name="orfao" defaultChecked={dados.orfao} label={c.orfao} />
        <CaixaSeleccao name="deficiencia" defaultChecked={dados.deficiencia} label={c.deficiencia} />
      </Seccao>

      <fieldset className="border-t border-line pt-5">
        <legend className="mb-5 text-[11px] font-semibold tracking-wider text-muted uppercase">{c.secMotivacao}</legend>
        <CampoAreaTexto name="motivacao" label={c.motivacao} rows={5} defaultValue={dados.motivacao} required />
      </fieldset>

      <EstadoMensagem estado={estado} />

      <div className="flex flex-wrap justify-end gap-3 border-t border-line pt-5">
        <BotaoSubmeter className="btn-secundario" name="intencao" value="guardar" pendente={t.comum.aGuardar}>
          {c.guardarRascunho}
        </BotaoSubmeter>
        <BotaoSubmeter className="btn-primario" name="intencao" value="submeter" pendente={c.aVerificar} confirmar={{ titulo: c.confirmarSubmissaoT, mensagem: c.confirmarSubmissao, rotulo: c.submeter }}>
          {c.submeter}
        </BotaoSubmeter>
      </div>
    </Formulario>
  );
}

export function CarregarDocumento({ id, tipo, substituir }: { id: string; tipo: string; substituir: boolean }) {
  const { t } = useI18n();
  const [estado, accao] = useActionState(carregarDocumentoAction, undefined);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (estado?.ok) ref.current?.reset();
  }, [estado]);
  return (
    <form ref={ref} action={accao} className="flex min-w-0 flex-1 flex-col gap-1">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="tipo" value={tipo} />
      <div className="flex items-center gap-2">
        <CampoFicheiro name="ficheiro" required accept=".pdf,.png,.jpg,.jpeg,.webp,.txt,.doc,.docx" />
        <BotaoSubmeter className="btn-secundario btn-sm" pendente="…">
          <Upload className="size-3.5" />
          {substituir ? t.candidatura.substituir : t.candidatura.carregar}
        </BotaoSubmeter>
      </div>
      {estado?.erro && <p className="text-xs text-danger">{estado.erro}</p>}
    </form>
  );
}
