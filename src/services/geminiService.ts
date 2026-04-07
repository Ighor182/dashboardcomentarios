import { supabase } from "../lib/supabase";

// ============================================================
// SERVIÇO DE IA — MÁQUINA DE INSIGHTS LINHA UNI (EDGE MODE)
// ============================================================

const CHUNK_SIZE = 50; 
const API_DELAY = 300; 

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

const NOVO_COMENTARIO_MARKERS = [
  "Novo comentário", "novo comentário", "NOVO COMENTÁRIO", "IA Analisar", "", undefined, null
];

function needsClassification(row: Record<string, any>): boolean {
  const fields = ["Nível", "Classificação (antiga)", "Categoria", "Subcategoria", "Tipo de necessidade para responder o comentário"];
  return fields.some(f => {
    const v = row[f];
    return NOVO_COMENTARIO_MARKERS.includes(v) || (typeof v === "string" && v.toLowerCase().includes("novo comentário"));
  });
}

function checkFutureDate(dateVal: any): string {
  if (!dateVal) return "";
  if (dateVal instanceof Date) return dateVal.toLocaleDateString('pt-BR');
  const dateStr = String(dateVal);
  try {
    const parts = dateStr.includes("/") ? dateStr.split("/") : dateStr.split("-");
    if (parts.length < 3) return dateStr;
    const day = parseInt(parts[0]);
    const month = parseInt(parts[1]);
    const year = parseInt(parts[2]);
    if (year === 2026 && month > 4 && day <= 12) return `${parts[1]}/${parts[0]}/${parts[2]}`;
  } catch (e) {}
  return dateStr;
}

export async function classifyComments(
  rawData: Record<string, any>[],
  onProgress?: (c: number, t: number) => void
): Promise<ClassifiedComment[]> {
  
  // 1. Preparar resultados baseados na planilha
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

  // 2. Identificar quais linhas precisam de IA
  const toClassifyIndices = rawData.map((row, i) => ({ row, i }))
    .filter(x => needsClassification(x.row))
    .map(x => x.i);

  if (toClassifyIndices.length === 0) return results;

  // 3. Processar em lotes via Supabase Edge Function
  const chunks = [];
  for (let i = 0; i < toClassifyIndices.length; i += CHUNK_SIZE) {
    chunks.push(toClassifyIndices.slice(i, i + CHUNK_SIZE));
  }

  for (let i = 0; i < chunks.length; i++) {
    const chunkIndices = chunks[i];
    const commentsChunk = chunkIndices.map(idx => ({
      index: idx,
      cod: results[idx].procedimento_codigo,
      nome: results[idx].procedimento_nome,
      msg: results[idx].comentario
    }));

    try {
      // CHAMANDO A EDGE FUNCTION NA NUVEM (MODO CLASSIFY)
      const { data, error } = await supabase.functions.invoke('analyze-comments', {
        body: { 
          comments: commentsChunk,
          mode: 'classify' 
        }
      });

      if (error) throw error;

      // Aplicar classificações ao array principal
      if (Array.isArray(data)) {
        console.log(`[IA] Lote ${i + 1} dados recebidos:`, data.length, "itens");
        data.forEach((cls: any) => {
          const idx = Number(cls.index);
          const item = results[idx];
          if (item) {
            item.classificacao = cls.classificacao || item.classificacao;
            // ... (campos restantes)
            item.categoria = cls.categoria || item.categoria;
            item.subcategoria = cls.subcategoria || item.subcategoria;
            item.processo_vinculado = cls.processo_vinculado || item.processo_vinculado;
            item.criticidade = cls.criticidade || item.criticidade;
          }
        });
      } else if (data && (data as any).error) {
        console.error(`[IA] FALHA NO LOTE ${i + 1}:`, (data as any).error);
        console.warn(`[IA] TEXTO BRUTO RESPOSTA:`, (data as any).raw);
      }
      
      console.log(`[Edge Function] Lote ${i + 1} de ${chunks.length} OK.`);
    } catch (e) {
      console.error(`[Edge Function] Erro no lote ${i + 1}:`, e);
    }

    onProgress?.(i + 1, chunks.length);
    if (i < chunks.length - 1) await new Promise(r => setTimeout(r, API_DELAY));
  }

  return results;
}

export async function generateInsights(data: ClassifiedComment[]): Promise<string> {
  try {
    const stats = { 
        total: data.length, 
        alta: data.filter(d => d.criticidade.includes("1")).length 
    };
    
    // CHAMANDO A EDGE FUNCTION NA NUVEM (MODO INSIGHTS)
    const { data: insights, error } = await supabase.functions.invoke('analyze-comments', {
        body: { 
            comments: [{ msg: "GERAR INSIGHTS GERAIS DO DASHBOARD", stats }],
            mode: 'insights'
        }
    });

    if (error) throw error;
    return typeof insights === 'string' ? insights : "Insights gerados com sucesso.";
  } catch {
    return "Insights temporariamente indisponíveis (Processamento via Edge Function).";
  }
}
