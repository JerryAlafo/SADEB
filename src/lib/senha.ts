import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

export function gerarHash(senha: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(senha, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verificarSenha(senha: string, guardado: string): boolean {
  const [salt, hash] = guardado.split(":");
  if (!salt || !hash) return false;
  const calc = scryptSync(senha, salt, 64);
  const ref = Buffer.from(hash, "hex");
  return ref.length === calc.length && timingSafeEqual(ref, calc);
}

export { validarSenha, type ErroSenha } from "./validacao";
