"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { Spinner } from "./carregamento";
import { useI18n } from "./i18n-provider";

/** Pede o ficheiro à API (com spinner durante a espera) e inicia a transferência. */
export function BotaoExportar({ href }: { href: string }) {
  const { t } = useI18n();
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState(false);

  async function exportar() {
    setOcupado(true);
    setErro(false);
    try {
      const r = await fetch(href, { credentials: "same-origin" });
      if (!r.ok) throw new Error(String(r.status));
      const nome = /filename="([^"]+)"/.exec(r.headers.get("Content-Disposition") ?? "")?.[1] ?? "sadeb.csv";
      const url = URL.createObjectURL(await r.blob());
      const a = Object.assign(document.createElement("a"), { href: url, download: nome });
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      setErro(true);
    } finally {
      setOcupado(false);
    }
  }

  return (
    <button type="button" onClick={exportar} disabled={ocupado} aria-busy={ocupado} className={erro ? "btn-perigo" : "btn-secundario"}>
      {ocupado ? <Spinner /> : <Download className="size-4" />}
      {ocupado ? t.comum.processando : t.comum.exportarCsv}
    </button>
  );
}
