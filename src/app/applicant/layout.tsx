import { Estrutura } from "@/components/estrutura";
import { exigirUtilizador } from "@/lib/auth";

export default async function LayoutCandidato({ children }: LayoutProps<"/applicant">) {
  const u = await exigirUtilizador("candidato");
  return <Estrutura utilizador={u}>{children}</Estrutura>;
}
