-- SCHEMA PARA SUPABASE SELF-HOSTED (REFERÊNCIA)
CREATE TABLE IF NOT EXISTS public.polls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id uuid REFERENCES public.polls(id) ON DELETE CASCADE,
  text text NOT NULL,
  vote_count int DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id uuid REFERENCES public.polls(id) ON DELETE CASCADE,
  option_id uuid REFERENCES public.options(id) ON DELETE CASCADE,
  voter_id text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(poll_id, voter_id)
);

-- Ativar RLS
ALTER TABLE public.polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.votes ENABLE ROW LEVEL SECURITY;

-- Exemplo de Função RPC para Registro Atômico de Voto
CREATE OR REPLACE FUNCTION public.register_vote(p_poll_id uuid, p_option_id uuid, p_voter_id text)
RETURNS void AS $$
BEGIN
  INSERT INTO public.votes (poll_id, option_id, voter_id)
  VALUES (p_poll_id, p_option_id, p_voter_id);

  UPDATE public.options
  SET vote_count = vote_count + 1
  WHERE id = p_option_id;
END;
$$ LANGUAGE plpgsql;
