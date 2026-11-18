import Link from "next/link";
import { FileQuestion } from "lucide-react";
import { obterI18n } from "@/lib/i18n/servidor";

export default async function NaoEncontrado() {
  const { t } = await obterI18n();
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="cartao w-full max-w-lg px-8 py-10 text-center">
        <FileQuestion className="mx-auto size-10 text-subtle" strokeWidth={1.5} />
        <p className="mt-4 font-mono text-sm font-semibold text-subtle">404</p>
        <h1 className="mt-1 text-xl font-semibold text-fg">{t.naoEncontrado.titulo}</h1>
        <p className="mt-2 text-sm text-muted">{t.naoEncontrado.texto}</p>
        <Link href="/" className="btn-primario mt-7">
          {t.naoEncontrado.voltar}
        </Link>
      </div>
    </main>
  );
}
