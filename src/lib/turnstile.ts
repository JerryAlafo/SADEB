// ─────────────────────────────────────────────────────────────
// SADEB — Cloudflare Turnstile (anti-bot no login)
//
// Activo só quando TURNSTILE_SECRET_KEY está definida (e, no cliente,
// NEXT_PUBLIC_TURNSTILE_SITE_KEY). Sem as chaves o login funciona como antes.
// Com a chave definida, falha fechado: token em falta, inválido ou Cloudflare
// inacessível → login recusado.
// ─────────────────────────────────────────────────────────────
import { ErroAuth } from "./autenticacao";

const SITEVERIFY = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

/** IP do cliente (Vercel/Cloudflare) para reforçar a validação. */
export function ipDoPedido(req: Request) {
  return req.headers.get("cf-connecting-ip") ?? req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? undefined;
}

export async function validarTurnstile(token: unknown, ip?: string) {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return;
  if (typeof token !== "string" || !token || token.length > 2048) throw new ErroAuth("captchaInvalido", undefined, 400);

  const body = new URLSearchParams({ secret, response: token });
  if (ip) body.set("remoteip", ip);
  let r: { success?: boolean; "error-codes"?: string[] };
  try {
    const res = await fetch(SITEVERIFY, { method: "POST", body, signal: AbortSignal.timeout(8000), cache: "no-store" });
    r = await res.json();
  } catch (e) {
    console.error("[SADEB · turnstile] siteverify inacessível", e);
    throw new ErroAuth("captchaIndisponivel", undefined, 503);
  }
  if (!r.success) {
    console.warn("[SADEB · turnstile] recusado", r["error-codes"]);
    throw new ErroAuth("captchaInvalido", undefined, 400);
  }
}
