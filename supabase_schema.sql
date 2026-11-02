-- ========================================================
-- T99 HALLOWEEN - SUPABASE SCHEMA FOR SELF-HOSTED INSTANCE
-- Executar no SQL Editor do seu Supabase (http://192.168.3.108:8000)
-- ========================================================

-- 1. Tabela de Candidatos e Fantasias
CREATE TABLE IF NOT EXISTS public.candidates (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  costume_name TEXT NOT NULL,
  category TEXT DEFAULT 'Todas',
  description TEXT DEFAULT '',
  photos JSONB DEFAULT '[]'::jsonb,
  votes INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Tabela de Votos Únicos por PC / Dispositivo (com Nome Completo do Votante)
CREATE TABLE IF NOT EXISTS public.votes (
  id TEXT PRIMARY KEY,
  device_id TEXT NOT NULL,
  voter_name TEXT NOT NULL DEFAULT '',
  candidate_id TEXT NOT NULL,
  candidate_name TEXT NOT NULL,
  voted_at TIMESTAMPTZ DEFAULT NOW()
);

-- Garantir coluna voter_name caso a tabela já tenha sido criada anteriormente
ALTER TABLE public.votes ADD COLUMN IF NOT EXISTS voter_name TEXT DEFAULT '';

-- 3. Habilitar Row Level Security (RLS) com acesso liberado para a votação pública
ALTER TABLE public.candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.votes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read candidates" ON public.candidates;
CREATE POLICY "Allow public read candidates" ON public.candidates FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public insert candidates" ON public.candidates;
CREATE POLICY "Allow public insert candidates" ON public.candidates FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public update candidates" ON public.candidates;
CREATE POLICY "Allow public update candidates" ON public.candidates FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Allow public delete candidates" ON public.candidates;
CREATE POLICY "Allow public delete candidates" ON public.candidates FOR DELETE USING (true);

DROP POLICY IF EXISTS "Allow public read votes" ON public.votes;
CREATE POLICY "Allow public read votes" ON public.votes FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public insert votes" ON public.votes;
CREATE POLICY "Allow public insert votes" ON public.votes FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public update votes" ON public.votes;
CREATE POLICY "Allow public update votes" ON public.votes FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Allow public delete votes" ON public.votes;
CREATE POLICY "Allow public delete votes" ON public.votes FOR DELETE USING (true);

-- 4. Habilitar Realtime para atualizações em tempo real
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
