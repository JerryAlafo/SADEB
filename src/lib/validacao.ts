// Regras de validação partilhadas por cliente e servidor (sem dependências do Node).

export type ErroSenha = "senhaComprimento" | "senhaMaiuscula" | "senhaNumero" | "senhaEspecial";

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Mesmas regras do backoffice: ≥ 8 caracteres, maiúscula, número e carácter especial. */
export function validarSenha(senha: string): ErroSenha[] {
  const erros: ErroSenha[] = [];
  if (senha.length < 8) erros.push("senhaComprimento");
  if (!/[A-Z]/.test(senha)) erros.push("senhaMaiuscula");
  if (!/[0-9]/.test(senha)) erros.push("senhaNumero");
  if (!/[\W_]/.test(senha)) erros.push("senhaEspecial");
  return erros;
}

/** j***a@dominio.mz */
export function mascararEmail(email: string) {
  const [u, d] = email.split("@");
  if (!d) return email;
  return `${u[0]}${"*".repeat(Math.max(2, u.length - 2))}${u.length > 1 ? u[u.length - 1] : ""}@${d}`;
}
