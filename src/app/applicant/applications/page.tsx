import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { TabelaCandidaturasCandidato } from "@/components/lista-candidaturas";
import { Cabecalho, Cartao, Vazio } from "@/components/ui";
import { exigirUtilizador } from "@/lib/auth";
import { listar } from "@/lib/db";
import { obterI18n } from "@/lib/i18n/servidor";
import type { Bolsa, Candidatura } from "@/lib/types";
import { latenciaPagina } from "@/lib/latencia";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await obterI18n()).t.candidato.minhas };
}

export default async function MinhasCandidaturas() {
  await latenciaPagina();
  const u = await exigirUtilizador("candidato");
  const { t, f } = await obterI18n();
  const [bolsas, cands] = await Promise.all([listar<Bolsa>("bolsas"), listar<Candidatura>("candidaturas")]);
  const minhas = cands.filter((c) => c.utilizadorId === u.id).sort((a, b) => b.criadaEm.localeCompare(a.criadaEm));
  return (
    <>
      <Cabecalho
        titulo={t.candidato.minhas}
        accoes={
          <Link href="/applicant/scholarships" className="btn-primario">
            <Plus className="size-4" />
            {t.candidato.novaCandidatura}
          </Link>
        }
      />
      <Cartao corpo="">{minhas.length ? <TabelaCandidaturasCandidato candidaturas={minhas} bolsas={bolsas} t={t} f={f} /> : <Vazio titulo={t.candidato.semCandidaturas} />}</Cartao>
    </>
  );
}
