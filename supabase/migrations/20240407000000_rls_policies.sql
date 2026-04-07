-- Ativar Segurança de Nível de Linha (RLS)
ALTER TABLE IF EXISTS comments ENABLE ROW LEVEL SECURITY;

-- Remover políticas antigas se existirem para evitar conflito
DROP POLICY IF EXISTS "Acesso total para usuários autenticados" ON comments;

-- Criar política: Apenas quem está logado pode ver/editar os dados
CREATE POLICY "Acesso total para usuários autenticados" 
ON comments 
FOR ALL 
TO authenticated 
USING (true)
WITH CHECK (true);
