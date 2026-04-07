import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const CLASSIFY_PROMPT = `Você é o Especialista Chefe de Operações da Linha Uni (Linha 6 - Laranja do Metrô de SP).
Sua missão é analisar comentários técnicos feitos por revisores sobre os Procedimentos Operacionais (POs) do sistema.

### CONTEXTO DE NEGÓCIO:
- Os POs descrevem como operar trens, estações e sistemas de sinalização.
- Erros de segurança ou lógica operacional são CRÍTICOS.
- Dúvidas de tradução ou termos técnicos são "Processo / Conceito".
- Erros de digitação são "Ortografia / Tradução".

### REGRAS DE ANÁLISE:
1. **Classificação**: 
   - 'Processo / Conceito': Se o comentário questiona a lógica da operação.
   - 'Ortografia / Tradução': Se for erro de português ou termo mal traduzido.
   - 'Pendência TDV': Se faltar informação técnica que só o fornecedor (TDV) tem.
2. **Processo Vinculado**: Tente identificar qual sistema está envolvido (Alstom para sinalização, Siemens para comunicação, Civil para infra, etc). Se for genérico, use 'Processo'.
3. **Criticidade**: 
   - '1 - Alto': Riscos operacionais, segurança ou erros de lógica grave.
   - '3 - Baixo': Erros de formatação ou gramática.

### REGRA DE SAÍDA:
Responda APENAS com um array JSON. Mantenha o campo "index" original.
Exemplo: [{"index": 0, "classificacao": "Processo / Conceito", "categoria": "Informação", "subcategoria": "CLU", "processo_vinculado": "Alstom", "criticidade": "1 - Alto"}]

DADOS PARA ANALISAR:`;

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
      generationConfig: { 
        temperature: 0.1,
        maxOutputTokens: 2048,
      },
      safetySettings: [
        { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
        { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
        { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
        { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }
      ]
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      }
    )

    const data = await response.json()
    
    // Se não houver candidatos, a IA bloqueou ou deu erro
    if (!data.candidates || data.candidates.length === 0) {
      console.error("Gemini Error/Block:", data);
      return new Response(JSON.stringify({ 
        error: "IA bloqueou o conteúdo ou erro de API", 
        raw: JSON.stringify(data) 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    const textResponse = data.candidates[0].content?.parts?.[0]?.text || ""

    // Tenta extrair o JSON
    const jsonMatch = textResponse.match(/\[[\s\S]*\]/)
    if (!jsonMatch) {
      console.error("Falha ao extrair JSON. Texto bruto:", textResponse);
      return new Response(JSON.stringify({ 
        error: "Falha na estrutura JSON da IA", 
        raw: textResponse 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200, // Mantemos 200 para ver o erro no data do front
      })
    }

    return new Response(jsonMatch[0], {
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
