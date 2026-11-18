import { Estrutura } from "@/components/estrutura";
import { exigirUtilizador } from "@/lib/auth";

export default async function LayoutComissao({ children }: LayoutProps<"/committee">) {
  const u = await exigirUtilizador("comissao", "admin");
  return <Estrutura utilizador={u}>{children}</Estrutura>;
}
