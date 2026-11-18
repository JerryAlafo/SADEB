import { agora, inserir, novoId } from "./db";
import type { EmailEnviado } from "./types";

/**
 * Envio de e-mail. Sem servidor SMTP configurado, a mensagem fica registada na
 * caixa de saída (data/emails.txt) e é escrita no terminal do servidor.
 */
export async function enviarEmail(para: string, assunto: string, texto: string) {
  const email: EmailEnviado = { id: novoId(), para, assunto, texto, enviadoEm: agora() };
  await inserir<EmailEnviado>("emails", email);
  const linha = "─".repeat(60);
  console.info(`\n${linha}\n[SADEB · e-mail] Para: ${para}\nAssunto: ${assunto}\n\n${texto}\n${linha}\n`);
  return email;
}
