"use client";

import { useActionState, useEffect, useRef } from "react";
import { actualizarPerfil, alterarSenha } from "@/app/actions/auth";
import { CampoSenha, CampoTexto } from "@/components/campos";
import { BotaoSubmeter, EstadoMensagem, Formulario } from "@/components/formularios";
import { useI18n } from "@/components/i18n-provider";
import type { UtilizadorPublico } from "@/lib/auth";

export function FormularioPerfil({ u }: { u: UtilizadorPublico }) {
  const { t } = useI18n();
  const [estado, accao, pendente] = useActionState(actualizarPerfil, undefined);
  return (
    <Formulario accao={accao} pendente={pendente} className="grid gap-5 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <CampoTexto name="nome" label={t.auth.nome} defaultValue={u.nome} required />
      </div>
      <CampoTexto label={t.auth.email} value={u.email} disabled readOnly />
      <CampoTexto name="telefone" label={t.auth.telefone} defaultValue={u.telefone} />
      <CampoTexto name="bi" label={t.auth.bi} defaultValue={u.bi} />
      <CampoTexto name="dataNascimento" type="date" label={t.auth.dataNascimento} defaultValue={u.dataNascimento} />
      <div className="sm:col-span-2">
        <EstadoMensagem estado={estado} />
      </div>
      <div className="flex justify-end border-t border-line pt-5 sm:col-span-2">
        <BotaoSubmeter pendente={t.comum.aGuardar}>{t.perfil.guardarPerfil}</BotaoSubmeter>
      </div>
    </Formulario>
  );
}

export function FormularioSenha() {
  const { t } = useI18n();
  const [estado, accao] = useActionState(alterarSenha, undefined);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (estado?.ok) ref.current?.reset();
  }, [estado]);
  return (
    <form ref={ref} action={accao} className="space-y-5">
      <CampoSenha name="actual" label={t.perfil.senhaActual} required autoComplete="current-password" />
      <CampoSenha name="nova" label={t.perfil.novaSenha} required autoComplete="new-password" ajuda={t.auth.regraSenha} />
      <EstadoMensagem estado={estado} />
      <div className="flex justify-end border-t border-line pt-5">
        <BotaoSubmeter className="btn-secundario">{t.perfil.alterarSenha}</BotaoSubmeter>
      </div>
    </form>
  );
}
