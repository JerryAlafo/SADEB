"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, CheckCircle2, ShieldX } from "lucide-react";
import { CampoSenha } from "@/components/campos";
import { Spinner } from "@/components/carregamento";
import { useI18n } from "@/components/i18n-provider";
import { Aviso } from "@/components/ui";
import { validarSenha } from "@/lib/validacao";
import { resetPassword } from "@/services/auth";

export function FormularioRedefinir({ token }: { token: string }) {
  const { t } = useI18n();
  const [nova, setNova] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [errosCampo, setErrosCampo] = useState<{ nova?: string; confirmar?: string }>({});
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    const erros: { nova?: string; confirmar?: string } = {};
    const s = validarSenha(nova);
    if (s.length) erros.nova = t.erros[s[0]];
    if (!confirmar || confirmar !== nova) erros.confirmar = t.erros.senhasDiferentes;
    setErrosCampo(erros);
    if (erros.nova || erros.confirmar) return;
    setCarregando(true);
    try {
      await resetPassword({ token, nova_password: nova }, t.erros.erroLigacao);
      setSucesso(true);
    } catch (err) {
      setErro((err as Error).message);
    } finally {
      setCarregando(false);
    }
  }

  if (!token)
    return (
      <div className="flex flex-col items-center gap-4 text-center">
        <span className="grid size-14 place-items-center rounded-sm bg-danger-soft text-danger">
          <ShieldX className="size-7" />
        </span>
        <h2 className="text-base font-semibold text-fg">{t.auth.linkInvalidoT}</h2>
        <p className="text-sm text-muted">{t.auth.linkInvalidoD}</p>
        <Link href="/forgot-password" className="mt-2 inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline">
          <ArrowLeft className="size-4" />
          {t.auth.pedirNovoLink}
        </Link>
      </div>
    );

  if (sucesso)
    return (
      <div className="flex flex-col items-center gap-4 text-center">
        <span className="grid size-14 place-items-center rounded-sm bg-success-soft text-success">
          <CheckCircle2 className="size-7" />
        </span>
        <h2 className="text-base font-semibold text-fg">{t.auth.senhaActualizadaT}</h2>
        <p className="text-sm text-muted">{t.auth.senhaActualizadaD}</p>
        <Link href="/auth" className="btn-primario mt-2">
          {t.auth.voltarLogin}
        </Link>
      </div>
    );

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
      {erro && (
        <Aviso
          tom="erro"
          accao={
            <Link href="/forgot-password" className="btn-secundario btn-sm">
              {t.auth.pedirNovoLink}
            </Link>
          }
        >
          {erro}
        </Aviso>
      )}
      <div>
        <CampoSenha
          label={t.auth.novaSenha}
          required
          autoComplete="new-password"
          disabled={carregando}
          erro={!!errosCampo.nova}
          value={nova}
          onChange={(e) => setNova(e.target.value)}
          ajuda={errosCampo.nova ? undefined : t.auth.regraSenha}
        />
        {errosCampo.nova && <p className="mt-1 px-1 text-xs text-danger">{errosCampo.nova}</p>}
      </div>
      <div>
        <CampoSenha
          label={t.auth.confirmarSenha}
          required
          autoComplete="new-password"
          disabled={carregando}
          erro={!!errosCampo.confirmar}
          value={confirmar}
          onChange={(e) => setConfirmar(e.target.value)}
        />
        {errosCampo.confirmar && <p className="mt-1 px-1 text-xs text-danger">{errosCampo.confirmar}</p>}
      </div>
      <button type="submit" disabled={carregando} className="btn-primario h-11 w-full">
        {carregando ? (
          <>
            <Spinner />
            {t.auth.aRedefinir}
          </>
        ) : (
          t.auth.redefinirT
        )}
      </button>
      <Link href="/auth" className="inline-flex items-center justify-center gap-2 text-sm font-medium text-primary hover:underline">
        <ArrowLeft className="size-4" />
        {t.auth.voltarLogin}
      </Link>
    </form>
  );
}
