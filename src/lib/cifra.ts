import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

// AES-256-GCM para dados sensíveis temporários (ex.: retrato do documento entre o OCR e o face match).
// O histórico do Git é permanente: tudo o que não deva ficar legível no repositório vai cifrado.

const SEGREDO = process.env.SADEB_CHAVE_CIFRA ?? "";

if (!SEGREDO && process.env.NODE_ENV === "production") {
  console.warn("[SADEB] SADEB_CHAVE_CIFRA não definida — a verificação de identidade vai falhar até ser configurada.");
}

function chave() {
  if (!SEGREDO) {
    if (process.env.NODE_ENV === "production") throw new Error("SADEB_CHAVE_CIFRA em falta");
    return createHash("sha256").update("sadeb-dev-apenas").digest();
  }
  return createHash("sha256").update(SEGREDO).digest();
}

export function cifrar(texto: string): string {
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", chave(), iv);
  const dados = Buffer.concat([c.update(texto, "utf8"), c.final()]);
  return `v1.${iv.toString("base64url")}.${c.getAuthTag().toString("base64url")}.${dados.toString("base64url")}`;
}

export function decifrar(cifrado: string): string {
  const [v, iv, tag, dados] = cifrado.split(".");
  if (v !== "v1" || !iv || !tag || !dados) throw new Error("Formato cifrado inválido");
  const d = createDecipheriv("aes-256-gcm", chave(), Buffer.from(iv, "base64url"));
  d.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([d.update(Buffer.from(dados, "base64url")), d.final()]).toString("utf8");
}

export function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}
