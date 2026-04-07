import { GoogleGenerativeAI } from "@google/generative-ai";

// ============================================================
// SERVIÇO DE IA — MÁQUINA DE INSIGHTS LINHA UNI (PADRÃO 2026)
// ============================================================

const MODEL_NAMES = ["gemini-2.5-flash", "gemini-3.1-pro", "gemini-2.0-pro"];
const CHUNK_SIZE = 60; 
const API_DELAY = 600; 

const NOVO_COMENTARIO_MARKERS = [
  "Novo comentário", "novo comentário", "NOVO COMENTÁRIO", "Novo Comentário", "IA Analisar", "", undefined, null
];

export interface ClassifiedComment {
  id: number;
  procedimento_codigo: string;
  procedimento_nome: string;
  tipo: string;
  versao: string;
  autor: string;
  empresa_autor: string;
  data: string;
  comentario: string;
  texto_marcado: string;
  classificacao: string;
  categoria: string;
  subcategoria: string;
  processo_vinculado: string;
  criticidade: string;
  status: string;
  pagina: string;
  id_sistema: string;
}

const CLASSIFICATION_SYSTEM_PROMPT = `Você é um Analista Sênior Metroviário. 
REGRA ABSOLUTA: Responda APENAS com um array JSON. Proibido introduções, saudações ou explicações.
Se você falar qualquer palavra fora do JSON, o sistema quebrará.

Dedução de Tipo: Se não houver código, use o nome (Guia=GUI, Procedimento=PRO).
Versão: V1, V1.0, V01 -> V1.
Empresa: "Sobrenome, Nome" -> TDV. "Nome Sobrenome" -> CLU.
Data: Se futura (após abril/2026), inverta dia/mês.

Taxonomia:
- Classificação: ["Informação insuficiente", "Não classificável", "Processo / Conceito", "Ortografia / Tradução", "Pendência TDV"]
- Categoria: ["Sistema", "Atualizar Design", "Informação"]
- Subcategoria: ["CLU", "TDV", "EPC"]
- Processo vinculado: ["Ação - TDV", "Ação - CLU", "Siemens", "Kanguini", "Revenga", "SICA", "TKE", "Zitron", "Hitachi", "Civil", "Convergint", "Processo", "Alstom"]
- Criticidade: ["1 - Alto", "2 - Médio", "3 - Baixo", "4 - Interno TDV"]`;

const INSIGHTS_SYSTEM_PROMPT = `Gere uma análise técnica e curta (8 linhas) sobre os dados da Linha Uni.`;

// ============================================================
// AUXILIARES
// ============================================================

function extractJsonArray(text: string): any[] {
  try {
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) throw new Error("Nenhum array JSON encontrado na resposta.");
    return JSON.parse(jsonMatch[0]);
  } catch (e) {
    console.error("[Gemini] Erro ao extrair JSON:", e);
    return [];
  }
}

function needsClassification(row: Record<string, any>): boolean {
  const fields = ["Nível", "Classificação (antiga)", "Categoria", "Subcategoria", "Tipo de necessidade para responder o comentário"];
  return fields.some(f => {
    const v = row[f];
    return NOVO_COMENTARIO_MARKERS.includes(v) || (typeof v === "string" && v.toLowerCase().includes("novo comentário"));
  });
}

function checkFutureDate(dateVal: any): string {
  if (!dateVal) return "";
  
  // Se já for um objeto Date, formatar como string PT-BR
  if (dateVal instanceof Date) {
    return dateVal.toLocaleDateString('pt-BR');
  }

  const dateStr = String(dateVal);
  try {
    const parts = dateStr.includes("/") ? dateStr.split("/") : dateStr.split("-");
    if (parts.length < 3) return dateStr;
    
    const day = parseInt(parts[0]);
    const month = parseInt(parts[1]);
    const year = parseInt(parts[2]);

    // Lógica para 2026: inverter se parecer MM/DD
    if (year === 2026 && month > 4 && day <= 12) { 
      return `${parts[1]}/${parts[0]}/${parts[2]}`;
    }
  } catch (e) {}
  return dateStr;
}

async function callGeminiWithFallback(apiKey: string, promptMessages: any[]) {
  const genAI = new GoogleGenerativeAI(apiKey);
  let lastError = null;

  for (const modelName of MODEL_NAMES) {
    try {
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent({ contents: promptMessages });
      return result.response.text();
    } catch (err: any) {
      lastError = err;
      continue;
    }
  }
  throw lastError || new Error("Falha total IA");
}

export async function classifyComments(
  rawData: Record<string, any>[],
  onProgress?: (c: number, t: number) => void
): Promise<ClassifiedComment[]> {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) throw new Error("API Key não configurada.");

  const results: ClassifiedComment[] = rawData.map((row, i) => {
    const author = row["Autor"] || "";
    return {
      id: i + 1,
      procedimento_codigo: row["Cód. Procedimento"] || "",
      procedimento_nome: row["Nome Procedimento"] || "",
      tipo: row["Tipo"] || "N/D",
      versao: row["Versão"] || "V1",
      autor: author,
      empresa_autor: author.includes(",") ? "TDV" : "CLU",
      data: checkFutureDate(row["Data"] || ""),
      comentario: row["Comentário Original"] || "",
      texto_marcado: row["Texto Marcado (Contexto)"] || "",
      classificacao: row["Classificação (antiga)"] || "Pendente",
      categoria: row["Categoria"] || "Informação",
      subcategoria: row["Subcategoria"] || "CLU",
      processo_vinculado: row["Tipo de necessidade para responder o comentário"] || "Processo",
      criticidade: row["Nível"] || "3 - Baixo",
      status: row["Status"] || "Aberto",
      pagina: row["Página"] || "",
      id_sistema: row["ID_SISTEMA"] || "",
    };
  });

  const toClassifyIndices = rawData.map((row, i) => ({ row, i }))
    .filter(x => needsClassification(x.row))
    .map(x => x.i);

  if (toClassifyIndices.length === 0) return results;

  const chunks = [];
  for (let i = 0; i < toClassifyIndices.length; i += CHUNK_SIZE) {
    chunks.push(toClassifyIndices.slice(i, i + CHUNK_SIZE));
  }

  for (let i = 0; i < chunks.length; i++) {
    const chunkIndices = chunks[i];
    const commentsData = chunkIndices.map(idx => ({
      index: idx,
      cod: results[idx].procedimento_codigo,
      nome: results[idx].procedimento_nome,
      msg: results[idx].comentario
    }));

    try {
      const messages = [
        { role: "user", parts: [{ text: CLASSIFICATION_SYSTEM_PROMPT }] },
        { role: "model", parts: [{ text: "[]" }] }, // Força a IA a pensar em formato de array
        { role: "user", parts: [{ text: `DATASET:\n${JSON.stringify(commentsData)}` }] }
      ];

      const response = await callGeminiWithFallback(apiKey, messages);
      const parsed = extractJsonArray(response);

      parsed.forEach((cls: any) => {
        const item = results[cls.index];
        if (item) {
          item.classificacao = cls.classificacao || item.classificacao;
          item.categoria = cls.categoria || item.categoria;
          item.subcategoria = cls.subcategoria || item.subcategoria;
          item.processo_vinculado = cls.processo_vinculado || item.processo_vinculado;
          item.criticidade = cls.criticidade || item.criticidade;
          if (cls.empresa_deduzida) item.empresa_autor = cls.empresa_deduzida;
          if (cls.tipo_deduzido) item.tipo = cls.tipo_deduzido;
          if (cls.versao_normalizada) item.versao = cls.versao_normalizada;
        }
      });
      console.log(`[Gemini] Lote ${i + 1} de ${chunks.length} processado OK.`);
    } catch (e) {
      console.error(`[Gemini] Erro no lote ${i + 1}`, e);
    }

    onProgress?.(i + 1, chunks.length);
    if (i < chunks.length - 1) await new Promise(r => setTimeout(r, API_DELAY));
  }

  return results;
}

export async function generateInsights(data: ClassifiedComment[]): Promise<string> {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) return "";
  try {
    const stats = { total: data.length, alta: data.filter(d => d.criticidade.includes("1")).length };
    const messages = [
      { role: "user", parts: [{ text: INSIGHTS_SYSTEM_PROMPT }] },
      { role: "model", parts: [{ text: "Ok." }] },
      { role: "user", parts: [{ text: `Dados: ${JSON.stringify(stats)}` }] }
    ];
    return await callGeminiWithFallback(apiKey, messages);
  } catch {
    return "Insights temporariamente indisponíveis.";
  }
}
