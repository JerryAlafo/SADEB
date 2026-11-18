import { Estrutura } from "@/components/estrutura";
import { exigirUtilizador } from "@/lib/auth";

export default async function LayoutAdmin({ children }: LayoutProps<"/admin">) {
  const u = await exigirUtilizador("admin");
  return <Estrutura utilizador={u}>{children}</Estrutura>;
}
