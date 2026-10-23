CREATE TABLE public.atlas_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid(),
  title text NOT NULL DEFAULT 'Nova conversa',
  pinned boolean NOT NULL DEFAULT false,
  mode text NOT NULL DEFAULT 'chat',
  messages jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX atlas_conversations_owner_idx ON public.atlas_conversations (user_id, company_id, updated_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.atlas_conversations TO authenticated;
GRANT ALL ON public.atlas_conversations TO service_role;
ALTER TABLE public.atlas_conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "conversations own" ON public.atlas_conversations FOR ALL TO authenticated
  USING (user_id = auth.uid() AND public.is_member(auth.uid(), company_id))
  WITH CHECK (user_id = auth.uid() AND public.is_member(auth.uid(), company_id));