CREATE TABLE public.sales_goals (
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  month date NOT NULL,
  seller_ref text NOT NULL,
  amount numeric NOT NULL DEFAULT 0 CHECK (amount >= 0),
  updated_by uuid DEFAULT auth.uid(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (company_id, month, seller_ref)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sales_goals TO authenticated;
GRANT ALL ON public.sales_goals TO service_role;
ALTER TABLE public.sales_goals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "goals members read" ON public.sales_goals FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.is_member(auth.uid(), company_id));
CREATE POLICY "goals managers write" ON public.sales_goals FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.member_role_of(auth.uid(), company_id) = 'gestor')
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.member_role_of(auth.uid(), company_id) = 'gestor');