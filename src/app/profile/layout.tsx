import { Estrutura } from "@/components/estrutura";
import { exigirUtilizador } from "@/lib/auth";

export default async function Layout({ children }: LayoutProps<"/profile">) {
  const u = await exigirUtilizador();
  return <Estrutura utilizador={u}>{children}</Estrutura>;
}
