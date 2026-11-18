"use client";

import Link from "next/link";
import { useActionState } from "react";
import { registar } from "@/app/actions/auth";
import { CampoSenha, CampoTexto } from "@/components/campos";
import { BotaoSubmeter, EstadoMensagem, Formulario } from "@/components/formularios";
import { useI18n } from "@/components/i18n-provider";

/** Dados vindos da verificação de identidade (OCR do documento). */
export interface DadosVerificados {
  nome?: string;
  bi?: string;
  dataNascimento?: string;
  /** BI e data de nascimento lidos de um documento real: só leitura (o servidor ignora o que vier no formulário). */
  bloqueados: boolean;
}

export function FormularioRegisto({ verificados }: { verificados?: DadosVerificados }) {
  const { t } = useI18n();
  const a = t.auth;
  const [estado, accao, pendente] = useActionState(registar, undefined);
  const bloq = verificados?.bloqueados ?? false;
  return (
    <Formulario accao={accao} pendente={pendente} className="grid gap-5 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <EstadoMensagem estado={estado} />
      </div>
      <div className="sm:col-span-2">
        <CampoTexto name="nome" label={a.nome} required autoComplete="name" defaultValue={verificados?.nome} />
      </div>
      <CampoTexto name="email" type="email" label={a.email} required autoComplete="email" />
      <CampoTexto name="telefone" label={a.telefone} autoComplete="tel" />
      <CampoTexto name="bi" label={a.bi} required defaultValue={verificados?.bi} readOnly={bloq} ajuda={bloq ? t.verificacao.dadosBloqueados : undefined} />
      <CampoTexto
        name="dataNascimento"
        type="date"
        label={a.dataNascimento}
        required
        defaultValue={verificados?.dataNascimento}
        readOnly={bloq}
        ajuda={bloq ? t.verificacao.dadosBloqueados : undefined}
      />
      <CampoSenha name="senha" label={a.senha} required autoComplete="new-password" ajuda={a.regraSenha} />
      <CampoSenha name="confirmar" label={a.confirmarSenha} required autoComplete="new-password" />
      <div className="sm:col-span-2">
        <BotaoSubmeter className="btn-primario h-11 w-full" pendente={a.aCriar}>
          {a.criarConta}
        </BotaoSubmeter>
      </div>
      <p className="border-t border-line pt-5 text-center text-sm text-muted sm:col-span-2">
        {a.jaTemConta}{" "}
        <Link href="/auth" className="font-medium text-primary hover:underline">
          {a.entrar}
        </Link>
      </p>
    </Formulario>
  );
}
