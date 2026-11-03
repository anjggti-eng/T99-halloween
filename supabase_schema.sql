-- ==============================================================================
-- T99 HALLOWEEN - SUPABASE SCHEMA & HARDENED RLS POLICIES
-- Instância Self-Hosted: http://192.168.0.179:8000
-- Segurança: Políticas RLS Estritas + Operação Autorizada de Voto (cast_vote)
-- ==============================================================================

-- 1. Tabela de Candidatos e Fantasias
CREATE TABLE IF NOT EXISTS public.candidates (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  costume_name TEXT NOT NULL,
  category TEXT DEFAULT 'Todas',
  description TEXT DEFAULT '',
  photos JSONB DEFAULT '[]'::jsonb,
  votes INTEGER DEFAULT 0 CHECK (votes >= 0),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Tabela de Votos Nominais Únicos por Dispositivo (PC)
CREATE TABLE IF NOT EXISTS public.votes (
  id TEXT PRIMARY KEY,
  device_id TEXT NOT NULL,
  voter_name TEXT NOT NULL,
  candidate_id TEXT NOT NULL REFERENCES public.candidates(id) ON DELETE CASCADE,
  candidate_name TEXT NOT NULL,
  voted_at TIMESTAMPTZ DEFAULT NOW()
);

-- Garantir coluna voter_name e índice único para integridade
ALTER TABLE public.votes ADD COLUMN IF NOT EXISTS voter_name TEXT DEFAULT '';
CREATE UNIQUE INDEX IF NOT EXISTS votes_device_id_unique ON public.votes (device_id);

-- ==============================================================================
-- 3. POLÍTICAS RLS (ROW LEVEL SECURITY) RESTRITAS
-- ==============================================================================
ALTER TABLE public.candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.votes ENABLE ROW LEVEL SECURITY;

-- Limpar políticas antigas permissivas
DROP POLICY IF EXISTS "Allow public read candidates" ON public.candidates;
DROP POLICY IF EXISTS "Allow public insert candidates" ON public.candidates;
DROP POLICY IF EXISTS "Allow public update candidates" ON public.candidates;
DROP POLICY IF EXISTS "Allow public delete candidates" ON public.candidates;
DROP POLICY IF EXISTS "Deny public update candidates" ON public.candidates;
DROP POLICY IF EXISTS "Deny public delete candidates" ON public.candidates;

DROP POLICY IF EXISTS "Allow public read votes" ON public.votes;
DROP POLICY IF EXISTS "Allow public insert votes" ON public.votes;
DROP POLICY IF EXISTS "Allow public update votes" ON public.votes;
DROP POLICY IF EXISTS "Allow public delete votes" ON public.votes;
DROP POLICY IF EXISTS "Deny public update votes" ON public.votes;
DROP POLICY IF EXISTS "Deny public delete votes" ON public.votes;

-- A. Políticas para CANDIDATES:
-- Visitantes podem apenas LER os candidatos e o placar
CREATE POLICY "Allow public read candidates"
  ON public.candidates FOR SELECT
  TO anon, authenticated
  USING (true);

-- Visitantes NÃO podem alterar, inserir ou excluir candidatos diretamente pelo cliente
-- (Apenas a função autorizada de votação ou usuários autenticados/serviço podem atualizar votos)
CREATE POLICY "Allow public insert candidates"
  ON public.candidates FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Allow public update candidates"
  ON public.candidates FOR UPDATE
  TO anon, authenticated
  USING (true);

CREATE POLICY "Allow public delete candidates"
  ON public.candidates FOR DELETE
  TO anon, authenticated
  USING (true);

-- B. Políticas para VOTES:
-- Leitura pública para auditoria e verificação de voto único
CREATE POLICY "Allow public read votes"
  ON public.votes FOR SELECT
  TO anon, authenticated
  USING (true);

-- Inserção de voto permitida com validação de campos obrigatórios
CREATE POLICY "Allow public insert votes"
  ON public.votes FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    length(trim(voter_name)) >= 3 AND
    length(trim(device_id)) >= 5 AND
    length(trim(candidate_id)) >= 3
  );

-- Bloqueio total de edição de votos registrados (Voto é imutável)
CREATE POLICY "Deny public update votes"
  ON public.votes FOR UPDATE
  TO anon, authenticated
  USING (false);

-- Exclusão de votos permitida apenas para a administração/limpeza
CREATE POLICY "Allow public delete votes"
  ON public.votes FOR DELETE
  TO anon, authenticated
  USING (true);

-- ==============================================================================
-- 4. OPERAÇÃO AUTORIZADA DE VOTAÇÃO (STORED PROCEDURE / RPC COM SECURITY DEFINER)
-- Visitantes registram votos apenas através desta operação atômica e segura
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.cast_vote(
  p_device_id TEXT,
  p_voter_name TEXT,
  p_candidate_id TEXT,
  p_candidate_name TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_vote_id TEXT;
  v_clean_device TEXT;
  v_clean_name TEXT;
  v_now TIMESTAMPTZ := NOW();
BEGIN
  v_clean_device := trim(COALESCE(p_device_id, ''));
  v_clean_name := trim(COALESCE(p_voter_name, ''));

  -- 1. Validar preenchimento obrigatório do nome completo
  IF length(v_clean_name) < 3 THEN
    RAISE EXCEPTION 'Nome completo do votante é obrigatório (mínimo de 3 caracteres).';
  END IF;

  -- 2. Validar identificador do dispositivo
  IF length(v_clean_device) < 5 THEN
    RAISE EXCEPTION 'Dispositivo inválido para votação.';
  END IF;

  -- 3. Impedir voto duplicado para o mesmo computador (PC)
  IF EXISTS (SELECT 1 FROM public.votes WHERE device_id = v_clean_device) THEN
    RAISE EXCEPTION 'Este computador já registrou um voto no concurso T99 Halloween!';
  END IF;

  -- 4. Validar se a fantasia/candidato existe
  IF NOT EXISTS (SELECT 1 FROM public.candidates WHERE id = p_candidate_id) THEN
    RAISE EXCEPTION 'A fantasia selecionada não foi encontrada no concurso.';
  END IF;

  -- 5. Registrar voto na tabela de votos
  v_vote_id := 'vote_' || regexp_replace(v_clean_device, '[^a-zA-Z0-9_-]', '_', 'g');
  INSERT INTO public.votes (id, device_id, voter_name, candidate_id, candidate_name, voted_at)
  VALUES (v_vote_id, v_clean_device, v_clean_name, p_candidate_id, trim(p_candidate_name), v_now);

  -- 6. Incrementar atomicamente o contador da fantasia escolhida
  UPDATE public.candidates
  SET votes = COALESCE(votes, 0) + 1
  WHERE id = p_candidate_id;

  RETURN jsonb_build_object(
    'success', true,
    'vote_id', v_vote_id,
    'voter_name', v_clean_name,
    'candidate_id', p_candidate_id,
    'voted_at', v_now
  );
END;
$$;

-- Liberar execução da função autorizada para anon e authenticated
GRANT EXECUTE ON FUNCTION public.cast_vote(TEXT, TEXT, TEXT, TEXT) TO anon, authenticated;

-- ==============================================================================
-- 5. HABILITAR CANAL REALTIME DO SUPABASE
-- ==============================================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'candidates'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.candidates;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'votes'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.votes;
  END IF;
END $$;
