CREATE TABLE public.bitrix_connections (
  company_id uuid PRIMARY KEY REFERENCES public.companies(id) ON DELETE CASCADE,
  domain text NOT NULL,
  member_id text NOT NULL UNIQUE,
  client_endpoint text NOT NULL,
  access_token text NOT NULL,
  refresh_token text NOT NULL,
  expires_at timestamptz NOT NULL,
  connected_by uuid NOT NULL,
  connected_at timestamptz NOT NULL DEFAULT now(),
  last_sync_at timestamptz,
  last_sync_status text,
  last_sync_error text,
  deals_count integer NOT NULL DEFAULT 0
);
GRANT ALL ON public.bitrix_connections TO service_role;
ALTER TABLE public.bitrix_connections ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.bitrix_oauth_states (
  nonce text PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  domain text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  used_at timestamptz
);
GRANT ALL ON public.bitrix_oauth_states TO service_role;
ALTER TABLE public.bitrix_oauth_states ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.bitrix_deals (
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  deal_id text NOT NULL,
  title text,
  stage_id text,
  category_id text,
  opportunity numeric NOT NULL DEFAULT 0,
  currency text,
  assigned_by_id text,
  closed boolean NOT NULL DEFAULT false,
  date_create timestamptz,
  close_date date,
  date_modify timestamptz,
  synced_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (company_id, deal_id)
);
GRANT SELECT ON public.bitrix_deals TO authenticated;
GRANT ALL ON public.bitrix_deals TO service_role;
ALTER TABLE public.bitrix_deals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "deals managers read" ON public.bitrix_deals FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR member_role_of(auth.uid(), company_id) = 'gestor'::member_role
    OR EXISTS (SELECT 1 FROM public.company_members m WHERE m.company_id = bitrix_deals.company_id AND m.user_id = auth.uid() AND m.seller_ref = bitrix_deals.assigned_by_id));

CREATE OR REPLACE FUNCTION public.bitrix_status(_company_id uuid)
RETURNS TABLE(domain text, connected_at timestamptz, last_sync_at timestamptz, last_sync_status text, last_sync_error text, deals_count integer)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT c.domain, c.connected_at, c.last_sync_at, c.last_sync_status, c.last_sync_error, c.deals_count
  FROM public.bitrix_connections c
  WHERE c.company_id = _company_id
    AND (public.is_member(auth.uid(), _company_id) OR public.has_role(auth.uid(), 'admin'::app_role))
$$;
REVOKE ALL ON FUNCTION public.bitrix_status(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.bitrix_status(uuid) TO authenticated;