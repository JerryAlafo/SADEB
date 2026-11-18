import type { Metadata } from "next";
import { alterarPapelAction, alternarActivoAction } from "@/app/actions/admin";
import { BotaoSubmeter } from "@/components/formularios";
import { Cabecalho, Cartao, Distintivo } from "@/components/ui";
import { exigirUtilizador } from "@/lib/auth";
import { listar } from "@/lib/db";
import { fmt } from "@/lib/i18n";
import { obterI18n } from "@/lib/i18n/servidor";
import type { Papel, Utilizador } from "@/lib/types";
import { cn, iniciais } from "@/lib/utils";
import { FormularioUtilizador } from "./formulario";
import { latenciaPagina } from "@/lib/latencia";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await obterI18n()).t.admin.utilizadoresT };
}

const ORDEM: Record<Papel, number> = { admin: 0, comissao: 1, candidato: 2 };
const PAPEIS: Papel[] = ["candidato", "comissao", "admin"];

export default async function Utilizadores() {
  await latenciaPagina();
  const eu = await exigirUtilizador("admin");
  const { t, f } = await obterI18n();
  const a = t.admin;
  const users = (await listar<Utilizador>("utilizadores")).sort((x, y) => ORDEM[x.papel] - ORDEM[y.papel] || x.nome.localeCompare(y.nome));

  return (
    <>
      <Cabecalho titulo={a.utilizadoresT} subtitulo={a.utilizadoresD} />
      <div className="grid gap-6 xl:grid-cols-[1fr_22rem]">
        <Cartao corpo="">
          <div className="overflow-x-auto">
            <table className="tabela">
              <thead>
                <tr>
                  <th>{a.colUtilizador}</th>
                  <th>{a.colPapel}</th>
                  <th>{a.colCriado}</th>
                  <th>{t.comum.estado}</th>
                  <th className="text-right">{t.comum.accoes}</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className={cn(!u.activo && "opacity-60")}>
                    <td>
                      <div className="flex items-center gap-3">
                        <span className="grid size-8 shrink-0 place-items-center rounded-sm bg-surface-2 text-xs font-semibold text-muted ring-1 ring-line">{iniciais(u.nome)}</span>
                        <div className="min-w-0">
                          <p className="truncate font-medium">{u.nome}</p>
                          <p className="truncate text-xs text-muted">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td>
                      {u.id === eu.id ? (
                        <span className="text-sm">
                          {t.papel[u.papel]} <span className="text-subtle">{a.voce}</span>
                        </span>
                      ) : (
                        <form action={alterarPapelAction} className="flex items-center gap-1">
                          <input type="hidden" name="id" value={u.id} />
                          <select name="papel" defaultValue={u.papel} aria-label={a.colPapel} className="h-8 rounded-md border border-line-strong bg-surface px-2 text-xs text-fg outline-none focus-visible:border-primary">
                            {PAPEIS.map((p) => (
                              <option key={p} value={p}>
                                {t.papel[p]}
                              </option>
                            ))}
                          </select>
                          <BotaoSubmeter className="btn-fantasma btn-sm" pendente="…">
                            {a.aplicar}
                          </BotaoSubmeter>
                        </form>
                      )}
                    </td>
                    <td className="font-mono text-[11px] whitespace-nowrap text-subtle">{f.data(u.criadoEm)}</td>
                    <td>
                      <Distintivo tom={u.activo ? "sucesso" : "neutro"}>{u.activo ? a.activo : a.inactivo}</Distintivo>
                    </td>
                    <td className="text-right">
                      {u.id !== eu.id && (
                        <form action={alternarActivoAction}>
                          <input type="hidden" name="id" value={u.id} />
                          <BotaoSubmeter
                            className={cn("btn-fantasma btn-sm", u.activo && "text-danger hover:bg-danger-soft")}
                            pendente="…"
                            confirmar={u.activo ? { titulo: a.confirmarDesactivarT, mensagem: fmt(a.confirmarDesactivar, { nome: u.nome }), tom: "perigo", rotulo: a.desactivar } : undefined}
                          >
                            {u.activo ? a.desactivar : a.activar}
                          </BotaoSubmeter>
                        </form>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Cartao>
        <Cartao titulo={a.novoUtilizador} className="self-start">
          <FormularioUtilizador />
        </Cartao>
      </div>
    </>
  );
}
