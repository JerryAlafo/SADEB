import { randomUUID } from "node:crypto";
import { gerarHash } from "./senha";
import { criteriosPadrao, DOCUMENTOS_PADRAO, REQUISITOS_PADRAO } from "./padroes";
import type { FicheiroSeed } from "./db";
import type { Bolsa, Candidatura, DadosCandidatura, Documento, Notificacao, Utilizador } from "./types";

function diaRelativo(dias: number) {
  const d = new Date();
  d.setDate(d.getDate() + dias);
  return d.toISOString().slice(0, 10);
}

function isoRelativo(dias: number, hora = 10) {
  const d = new Date();
  d.setDate(d.getDate() + dias);
  d.setHours(hora, 0, 0, 0);
  return d.toISOString();
}

/**
 * Dados iniciais, criados quando utilizadores.txt ainda não existe.
 * Devolve os ficheiros a gravar (num único commit no driver GitHub).
 *
 *  SADEB_SEED_DEMO=0 → só o administrador (SADEB_ADMIN_EMAIL / SADEB_ADMIN_SENHA), sem dados fictícios.
 *  Por omissão        → dados de demonstração com as contas do README.
 */
export async function seed(): Promise<FicheiroSeed[]> {
  const ts = new Date().toISOString();
  const demoActiva = process.env.SADEB_SEED_DEMO !== "0";

  const user = (nome: string, email: string, papel: Utilizador["papel"], senha: string, extra: Partial<Utilizador> = {}): Utilizador => ({
    id: randomUUID(),
    nome,
    email,
    papel,
    passwordHash: gerarHash(senha),
    activo: true,
    criadoEm: ts,
    ...extra,
  });

  if (!demoActiva) {
    const email = (process.env.SADEB_ADMIN_EMAIL ?? "admin@sadeb.ac.mz").toLowerCase();
    const senha = process.env.SADEB_ADMIN_SENHA ?? "";
    if (senha.length < 12) throw new Error("SADEB_SEED_DEMO=0 exige SADEB_ADMIN_SENHA com pelo menos 12 caracteres.");
    return [
      ...(["bolsas", "candidaturas", "notificacoes", "decisoes", "sessoes", "verificacoes"] as const).map((colecao) => ({ colecao, registos: [] })),
      { colecao: "auditoria", registos: [{ id: randomUUID(), em: ts, utilizador: "Sistema", accao: "seed" }] },
      { colecao: "utilizadores", registos: [user("Administrador do Sistema", email, "admin", senha)] },
    ];
  }

  const admin = user("Administrador do Sistema", "admin@sadeb.ac.mz", "admin", "Admin@123");
  const comissao = user("Prof. Arsénio Mindu", "comissao@sadeb.ac.mz", "comissao", "Comissao@123");
  const demo = user("Joana Matsinhe", "candidato@sadeb.ac.mz", "candidato", "Candidato@123", {
    telefone: "+258 84 000 0000",
    bi: "110100000000A",
    dataNascimento: "2004-05-12",
  });

  const bolsaAberta: Bolsa = {
    id: randomUUID(),
    titulo: "Bolsa de Mérito Social 2027",
    descricao:
      "Bolsa destinada a estudantes com bom desempenho académico e situação socioeconómica desfavorecida. Cobre propinas e subsídio mensal de alimentação.",
    entidade: "Escola Superior de Ciências Náuticas",
    anoLectivo: "2027",
    vagas: 5,
    vagasListaEspera: 5,
    dataAbertura: diaRelativo(-15),
    dataEncerramento: diaRelativo(45),
    documentosObrigatorios: [...DOCUMENTOS_PADRAO],
    requisitos: { ...REQUISITOS_PADRAO },
    criterios: criteriosPadrao(),
    estado: "aberta",
    criadoEm: ts,
    actualizadoEm: ts,
  };

  const bolsaEncerrada: Bolsa = {
    id: randomUUID(),
    titulo: "Bolsa ESCN — Ciências Náuticas e Rádio (2.º semestre)",
    descricao:
      "Bolsa institucional para estudantes dos cursos de Ciências Náuticas e Telecomunicações e Rádio. Prazo de candidatura já encerrado — pronta para o cálculo automático pela Comissão.",
    entidade: "Escola Superior de Ciências Náuticas — Departamento de Rádio",
    anoLectivo: "2026",
    vagas: 3,
    vagasListaEspera: 3,
    dataAbertura: diaRelativo(-75),
    dataEncerramento: diaRelativo(-5),
    documentosObrigatorios: [...DOCUMENTOS_PADRAO],
    requisitos: { ...REQUISITOS_PADRAO, areasElegiveis: ["Ciências Náuticas", "Telecomunicações e Rádio"] },
    criterios: criteriosPadrao(),
    estado: "aberta",
    criadoEm: ts,
    actualizadoEm: ts,
  };

  // Candidatos fictícios para a bolsa encerrada
  const perfis: Array<[string, string, Partial<DadosCandidatura>, "ok" | "baixa" | "incompleta"]> = [
    ["Amélia Cossa", "2003-02-10", { media: 17.4, rendimentoFamiliar: 18000, agregadoFamiliar: 6, actividadesExtra: 4, area: "Ciências Náuticas" }, "ok"],
    ["Bento Machava", "2002-08-21", { media: 15.2, rendimentoFamiliar: 9000, agregadoFamiliar: 7, orfao: true, actividadesExtra: 2, area: "Telecomunicações e Rádio" }, "ok"],
    ["Celeste Nhantumbo", "2004-11-03", { media: 18.1, rendimentoFamiliar: 45000, agregadoFamiliar: 4, actividadesExtra: 5, area: "Ciências Náuticas" }, "ok"],
    ["Dércio Mabunda", "2003-06-15", { media: 13.8, rendimentoFamiliar: 6000, agregadoFamiliar: 8, deficiencia: true, actividadesExtra: 1, area: "Telecomunicações e Rádio" }, "ok"],
    ["Esperança Sitoe", "2004-01-29", { media: 16.0, rendimentoFamiliar: 24000, agregadoFamiliar: 5, actividadesExtra: 3, area: "Ciências Náuticas" }, "ok"],
    ["Fernando Chirindza", "2002-12-08", { media: 14.5, rendimentoFamiliar: 15000, agregadoFamiliar: 5, actividadesExtra: 2, area: "Telecomunicações e Rádio" }, "ok"],
    ["Graça Muianga", "2003-09-17", { media: 15.9, rendimentoFamiliar: 12000, agregadoFamiliar: 4, orfao: true, actividadesExtra: 3, area: "Ciências Náuticas" }, "ok"],
    ["Hélio Tembe", "2004-04-04", { media: 12.6, rendimentoFamiliar: 7000, agregadoFamiliar: 6, actividadesExtra: 0, area: "Telecomunicações e Rádio" }, "ok"],
    ["Inês Langa", "2003-03-23", { media: 11.2, rendimentoFamiliar: 8000, agregadoFamiliar: 5, actividadesExtra: 1, area: "Ciências Náuticas" }, "baixa"],
    ["Jaime Bila", "2002-07-30", { media: 14.0, rendimentoFamiliar: 10000, agregadoFamiliar: 5, actividadesExtra: 2, area: "Ciências Náuticas" }, "incompleta"],
  ];

  const utilizadores: Utilizador[] = [admin, comissao, demo];
  const candidaturas: Candidatura[] = [];
  const notificacoes: Notificacao[] = [];
  const uploads: FicheiroSeed[] = [];

  let seq = 1;
  for (const [nome, nasc, dados, tipo] of perfis) {
    const slug = nome.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, ".");
    const u = user(nome, `${slug}@estudante.ac.mz`, "candidato", "Candidato@123", {
      dataNascimento: nasc,
      telefone: `+258 84 ${String(1000000 + seq * 137).slice(0, 3)} ${String(1000 + seq * 7).slice(0, 4)}`,
    });
    utilizadores.push(u);

    const candId = randomUUID();
    const docsTipos = tipo === "incompleta" ? DOCUMENTOS_PADRAO.slice(0, 2) : DOCUMENTOS_PADRAO;
    const documentos: Documento[] = [];
    for (const t of docsTipos) {
      const docId = randomUUID();
      const rel = `${candId}/${docId}.txt`;
      uploads.push({ upload: rel, conteudo: `Documento de demonstração\nCandidato: ${nome}\nTipo: ${t}\n` });
      documentos.push({ id: docId, tipo: t, nomeOriginal: `${t}.txt`, ficheiro: rel, tamanho: 64, carregadoEm: isoRelativo(-20) });
    }

    const submetidaEm = isoRelativo(-30 + seq, 9 + (seq % 6));
    const ev = (por: string, accao: string, extra: Partial<Candidatura["historico"][number]> = {}) => ({ em: submetidaEm, por, accao, ...extra });
    const base: Candidatura = {
      id: candId,
      codigo: `SADEB-2026-${String(seq).padStart(4, "0")}`,
      bolsaId: bolsaEncerrada.id,
      utilizadorId: u.id,
      dados: {
        curso: dados.area === "Ciências Náuticas" ? "Licenciatura em Ciências Náuticas" : "Licenciatura em Telecomunicações",
        area: dados.area ?? "Ciências Náuticas",
        instituicao: "Escola Superior de Ciências Náuticas",
        anoFrequencia: 1 + (seq % 4),
        media: 0,
        rendimentoFamiliar: 0,
        agregadoFamiliar: 1,
        orfao: false,
        deficiencia: false,
        actividadesExtra: 0,
        distanciaKm: 5 + seq * 3,
        motivacao:
          "Pretendo concluir a minha formação com distinção e contribuir para o desenvolvimento do sector marítimo e das comunicações em Moçambique.",
        ...dados,
      },
      documentos,
      estado: "elegivel",
      submetidaEm,
      pendencias: [],
      historico: [ev(nome, "iniciada"), ev(nome, "submetida"), ev("Sistema", "registada")],
      criadaEm: isoRelativo(-35),
      actualizadaEm: submetidaEm,
    };
    const link = `/applicant/applications/${candId}`;

    if (tipo === "ok") {
      base.historico.push(ev("Sistema", "completa"), ev("Sistema", "requisitosCumpridos"));
    } else if (tipo === "baixa") {
      base.estado = "rejeitada";
      base.motivos = [{ chave: "mediaBaixa", params: { media: "11.2", min: 12 } }];
      base.historico.push(ev("Sistema", "completa"), ev("Sistema", "rejeitadaRequisitos", { motivos: base.motivos }), ev("Sistema", "rejeicaoComunicada"));
      notificacoes.push({ id: randomUUID(), utilizadorId: u.id, tipo: "erro", lida: false, criadaEm: submetidaEm, chave: "naoElegivel", params: { codigo: base.codigo }, link });
    } else {
      base.estado = "correcao_solicitada";
      base.pendencias = DOCUMENTOS_PADRAO.slice(2).map((d) => `doc:${d}`);
      base.historico.push(ev("Sistema", "correcaoSolicitada", { pendencias: base.pendencias }));
      notificacoes.push({ id: randomUUID(), utilizadorId: u.id, tipo: "aviso", lida: false, criadaEm: submetidaEm, chave: "incompleta", params: { codigo: base.codigo }, link });
    }
    candidaturas.push(base);
    seq++;
  }

  notificacoes.push({
    id: randomUUID(), utilizadorId: demo.id, tipo: "info", lida: false, criadaEm: ts,
    chave: "concursoAberto", params: { bolsa: bolsaAberta.titulo }, link: `/scholarships/${bolsaAberta.id}`,
  });

  return [
    ...uploads,
    { colecao: "bolsas", registos: [bolsaAberta, bolsaEncerrada] },
    { colecao: "candidaturas", registos: candidaturas },
    { colecao: "notificacoes", registos: notificacoes },
    { colecao: "decisoes", registos: [] },
    { colecao: "sessoes", registos: [] },
    { colecao: "verificacoes", registos: [] },
    { colecao: "auditoria", registos: [{ id: randomUUID(), em: ts, utilizador: "Sistema", accao: "seed" }] },
    // utilizadores por último: é o ficheiro que indica que o seed já correu
    { colecao: "utilizadores", registos: utilizadores },
  ];
}
