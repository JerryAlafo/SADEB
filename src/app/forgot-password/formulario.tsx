"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, MailCheck } from "lucide-react";
import { CampoTexto } from "@/components/campos";
import { Spinner } from "@/components/carregamento";
import { useI18n } from "@/components/i18n-provider";
import { Aviso } from "@/components/ui";
import { EMAIL_RE } from "@/lib/validacao";
import { forgotPassword } from "@/services/auth";

export function FormularioRecuperar() {
  const { t } = useI18n();
  const [email, setEmail] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [mensagem, setMensagem] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    if (!EMAIL_RE.test(email.trim())) {
      setErro(t.erros.emailInvalido);
      return;
    }
    setCarregando(true);
    try {
      setMensagem(await forgotPassword(email.trim(), t.erros.erroLigacao));
    } catch (err) {
      setErro((err as Error).message);
    } finally {
      setCarregando(false);
    }
  }

  if (mensagem)
    return (
      <div className="flex flex-col items-center gap-4 text-center">
        <span className="grid size-14 place-items-center rounded-sm bg-success-soft text-success">
          <MailCheck className="size-7" />
        </span>
        <h2 className="text-base font-semibold text-fg">{t.auth.emailEnviadoT}</h2>
        <p className="text-sm text-muted">{mensagem}</p>
        <Link href="/auth" className="mt-2 inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline">
          <ArrowLeft className="size-4" />
          {t.auth.voltarLogin}
        </Link>
      </div>
    );

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
      {erro && <Aviso tom="erro">{erro}</Aviso>}
      <CampoTexto id="email" type="email" label={t.auth.email} required autoComplete="email" disabled={carregando} erro={!!erro} value={email} onChange={(e) => setEmail(e.target.value)} />
      <button type="submit" disabled={carregando} className="btn-primario h-11 w-full">
        {carregando ? (
          <>
            <Spinner />
            {t.comum.aEnviar}
          </>
        ) : (
          t.auth.enviarEmail
        )}
      </button>
      <Link href="/auth" className="inline-flex items-center justify-center gap-2 text-sm font-medium text-primary hover:underline">
        <ArrowLeft className="size-4" />
        {t.auth.voltarLogin}
      </Link>
    </form>
  );
}
