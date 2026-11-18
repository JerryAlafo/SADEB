// Serviços de autenticação no cliente — mesma estrutura do backoffice (services/auth/*).
type ApiReturn<T> = { success: boolean; message: string; data: T };

async function post<T>(url: string, body: unknown, erroLigacao: string): Promise<ApiReturn<T>> {
  let r: Response;
  try {
    r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify(body) });
  } catch {
    throw new Error(erroLigacao);
  }
  const data = (await r.json().catch(() => null)) as ApiReturn<T> | null;
  if (!data) throw new Error(erroLigacao);
  if (!data.success) throw new Error(data.message);
  return data;
}

export async function login(p: { email: string; password: string; redirect?: string }, erroLigacao: string) {
  return (await post<{ redirect: string }>("/api/auth/login", p, erroLigacao)).data;
}

export async function forgotPassword(email: string, erroLigacao: string) {
  return (await post<null>("/api/auth/forgot-password", { email }, erroLigacao)).message;
}

export async function resetPassword(p: { token: string; nova_password: string }, erroLigacao: string) {
  return (await post<null>("/api/auth/reset-password", p, erroLigacao)).message;
}
