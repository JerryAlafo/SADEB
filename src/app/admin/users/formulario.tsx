"use client";

import { useActionState } from "react";
import { criarUtilizadorAction } from "@/app/actions/admin";
import { CampoSelect, CampoTexto } from "@/components/campos";
import { BotaoSubmeter, EstadoMensagem, Formulario } from "@/components/formularios";
import { useI18n } from "@/components/i18n-provider";
import type { Papel } from "@/lib/types";

export function FormularioUtilizador() {
  const { t } = useI18n();
  const a = t.admin;
  const [estado, accao, pendente] = useActionState(criarUtilizadorAction, undefined);
  const papeis: Papel[] = ["comissao", "admin", "candidato"];
  return (
    <Formulario accao={accao} pendente={pendente} className="space-y-5">
      <CampoTexto name="nome" label={a.nome} required />
      <CampoTexto name="email" type="email" label={a.email} required />
      <CampoSelect name="papel" label={a.papel} defaultValue="comissao" options={papeis.map((p) => ({ value: p, label: t.papel[p] }))} required />
      <CampoTexto name="senha" label={a.senhaInicial} required className="font-mono" ajuda={t.auth.regraSenha} />
      <EstadoMensagem estado={estado} />
      <BotaoSubmeter className="btn-primario w-full" pendente={t.comum.aGuardar}>
        {a.criarUtilizador}
      </BotaoSubmeter>
    </Formulario>
  );
}
