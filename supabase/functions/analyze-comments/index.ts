import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SYSTEM_PROMPT = `Você é um Analista Sênior Metroviário da Linha Uni.
REGRA ABSOLUTA: Responda APENAS com um array JSON válido. Proibido introduções ou explicações.
Taxonomia:
- Classificação: ["Informação insuficiente", "Não classificável", "Processo / Conceito", "Ortografia / Tradução", "Pendência TDV"]
- Categoria: ["Sistema", "Atualizar Design", "Informação"]
- Subcategoria: ["CLU", "TDV", "EPC"]
- Processo vinculado: ["Ação - TDV", "Ação - CLU", "Siemens", "Kanguini", "Revenga", "SICA", "TKE", "Zitron", "Hitachi", "Civil", "Convergint", "Processo", "Alstom"]
- Criticidade: ["1 - Alto", "2 - Médio", "3 - Baixo", "4 - Interno TDV"]

Instruções Adicionais:
- Dedução de Tipo: Se não houver código, use o nome (Guia=GUI, Procedimento=PRO).
- Versão: Normalizar para V1, V2, etc.
- Empresa: Deduzir pelo formato do nome do autor.`;

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { comments } = await req.json()
    const apiKey = Deno.env.get('GEMINI_API_KEY')

    if (!apiKey) {
      throw new Error('Chave GEMINI_API_KEY não configurada no Supabase Secrets.')
    }

    const payload = {
      contents: [
        { role: "user", parts: [{ text: SYSTEM_PROMPT }] },
        { role: "model", parts: [{ text: "Compreendido. Envie os dados." }] },
        { role: "user", parts: [{ text: `DATASET:\n${JSON.stringify(comments)}` }] }
      ],
      generationConfig: {
        temperature: 0.1,
        topP: 0.8,
        topK: 40
      }
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
    const textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || "[]"
    
    // Limpeza de JSON (Regex)
    const jsonMatch = textResponse.match(/\[[\s\S]*\]/)
    const cleanJson = jsonMatch ? jsonMatch[0] : "[]"

    return new Response(cleanJson, {
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
