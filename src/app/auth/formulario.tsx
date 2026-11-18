"use client";

// Fluxo de login do backoffice-regulador (sem OTP):
// validação no cliente → POST /api/auth/login → sessão criada → redirecciona para o painel do perfil
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { CampoSenha, CampoTexto } from "@/components/campos";
import { Spinner } from "@/components/carregamento";
import { useI18n } from "@/components/i18n-provider";
import { Aviso } from "@/components/ui";
import { EMAIL_RE, validarSenha } from "@/lib/validacao";
import { login } from "@/services/auth";

export function FormularioEntrar({ destino }: { destino?: string }) {
  const { t } = useI18n();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errosCampo, setErrosCampo] = useState<{ email?: string; password?: string }>({});
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  function validar() {
    const e: { email?: string; password?: string } = {};
    if (!EMAIL_RE.test(email.trim())) e.email = t.erros.emailInvalido;
    const s = validarSenha(password);
    if (s.length) e.password = t.erros[s[0]];
    setErrosCampo(e);
    return !e.email && !e.password;
  }

  async function onSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    setErro(null);
    if (!validar()) return;
    setCarregando(true);
    try {
      const r = await login({ email: email.trim(), password, redirect: destino }, t.erros.erroLigacao);
      router.replace(r.redirect);
      router.refresh();
    } catch (e) {
      setErro((e as Error).message);
      setCarregando(false);
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
      {erro && <Aviso tom="erro">{erro}</Aviso>}

      <div>
        <CampoTexto
          id="email"
          type="email"
          label={t.auth.email}
          required
          autoComplete="email"
          disabled={carregando}
          erro={!!errosCampo.email}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        {errosCampo.email && <p className="mt-1 px-1 text-xs text-danger">{errosCampo.email}</p>}
      </div>

      <div>
        <CampoSenha
          id="password"
          label={t.auth.senha}
          required
          autoComplete="current-password"
          disabled={carregando}
          erro={!!errosCampo.password}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {errosCampo.password && <p className="mt-1 px-1 text-xs text-danger">{errosCampo.password}</p>}
      </div>

      <button type="submit" disabled={carregando} className="btn-primario h-11 w-full">
        {carregando ? (
          <>
            <Spinner />
            {t.auth.aEntrar}
          </>
        ) : (
          t.auth.entrar
        )}
      </button>

      <Link href="/forgot-password" className="text-center text-sm font-medium text-primary underline-offset-4 hover:underline">
        {t.auth.esqueceu}
      </Link>

      <p className="border-t border-line pt-5 text-center text-sm text-muted">
        {t.auth.semConta}{" "}
        <Link href="/register" className="font-medium text-primary hover:underline">
          {t.auth.criarContaCandidato}
        </Link>
      </p>
    </form>
  );
}
