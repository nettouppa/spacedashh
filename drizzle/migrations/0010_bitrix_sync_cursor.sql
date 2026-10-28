ALTER TABLE public.bitrix_connections ADD COLUMN IF NOT EXISTS sync_cursor integer NOT NULL DEFAULT 0;
ALTER TABLE public.bitrix_connections ADD COLUMN IF NOT EXISTS last_full_sync_at timestamptz;
CREATE OR REPLACE FUNCTION public.bitrix_sync_progress(_company_id uuid)
RETURNS TABLE(sync_cursor integer, last_full_sync_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT c.sync_cursor, c.last_full_sync_at FROM public.bitrix_connections c
  WHERE c.company_id = _company_id AND (public.is_member(auth.uid(), _company_id) OR public.has_role(auth.uid(), 'admin'))
$$;
REVOKE ALL ON FUNCTION public.bitrix_sync_progress(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.bitrix_sync_progress(uuid) TO authenticated;