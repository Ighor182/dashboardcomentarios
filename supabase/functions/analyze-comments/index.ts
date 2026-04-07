import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const CLASSIFY_PROMPT = `Você é um Analista Sênior Metroviário da Linha Uni.
REGRA ABSOLUTA: Responda APENAS com um array JSON válido. Proibido introduções ou explicações.
Cada objeto no array DEVE conter o campo "index" (o mesmo enviado na entrada) e os campos de análise abaixo.

Estrutura do JSON Esperada:
[
  {
    "index": number,
    "classificacao": string, (Taxonomia: ["Informação insuficiente", "Não classificável", "Processo / Conceito", "Ortografia / Tradução", "Pendência TDV"])
    "categoria": string, (Taxonomia: ["Sistema", "Atualizar Design", "Informação"])
    "subcategoria": string, (Taxonomia: ["CLU", "TDV", "EPC"])
    "processo_vinculado": string, (Taxonomia: ["Ação - TDV", "Ação - CLU", "Siemens", "Kanguini", "Revenga", "SICA", "TKE", "Zitron", "Hitachi", "Civil", "Convergint", "Processo", "Alstom"])
    "criticidade": string (Taxonomia: ["1 - Alto", "2 - Médio", "3 - Baixo", "4 - Interno TDV"])
  }
]`;

const INSIGHTS_PROMPT = `Você é um Consultor de Estratégia Metroviária da Linha Uni.
Gere um relatório técnico curto (máximo 8 linhas) sobre os dados fornecidos. 
Foque em tendências de segurança e criticidade.`;

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { comments, mode = 'classify' } = await req.json()
    const apiKey = Deno.env.get('GEMINI_API_KEY')

    if (!apiKey) throw new Error('API Key não configurada.')

    const prompt = mode === 'insights' ? INSIGHTS_PROMPT : CLASSIFY_PROMPT;

    const payload = {
      contents: [
        { role: "user", parts: [{ text: prompt }] },
        { role: "model", parts: [{ text: "Ok, envie os dados." }] },
        { role: "user", parts: [{ text: `DADOS:\n${JSON.stringify(comments)}` }] }
      ],
      generationConfig: { temperature: 0.1 }
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      }
    )

    const data = await response.json()
    const textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || ""

    // Se for insights, retorna o texto puro. Se for classify, limpa o JSON.
    let finalResponse = textResponse;
    if (mode === 'classify') {
      const jsonMatch = textResponse.match(/\[[\s\S]*\]/)
      finalResponse = jsonMatch ? jsonMatch[0] : "[]"
    }

    return new Response(finalResponse, {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
