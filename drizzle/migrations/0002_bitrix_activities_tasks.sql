CREATE TABLE public.bitrix_activities (
  company_id uuid NOT NULL,
  activity_id text NOT NULL,
  type text NOT NULL DEFAULT 'other',
  subject text,
  responsible_id text,
  owner_type_id text,
  owner_id text,
  completed boolean NOT NULL DEFAULT false,
  created_at timestamptz,
  deadline timestamptz,
  synced_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (company_id, activity_id)
);
GRANT SELECT ON public.bitrix_activities TO authenticated;
GRANT ALL ON public.bitrix_activities TO service_role;
ALTER TABLE public.bitrix_activities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "activities scoped read" ON public.bitrix_activities FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'admin') OR member_role_of(auth.uid(), company_id) = 'gestor'
  OR EXISTS (SELECT 1 FROM public.company_members m WHERE m.company_id = bitrix_activities.company_id AND m.user_id = auth.uid() AND m.seller_ref = bitrix_activities.responsible_id));

CREATE TABLE public.bitrix_tasks (
  company_id uuid NOT NULL,
  task_id text NOT NULL,
  title text,
  responsible_id text,
  status text,
  created_at timestamptz,
  deadline timestamptz,
  closed_at timestamptz,
  synced_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (company_id, task_id)
);
GRANT SELECT ON public.bitrix_tasks TO authenticated;
GRANT ALL ON public.bitrix_tasks TO service_role;
ALTER TABLE public.bitrix_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tasks scoped read" ON public.bitrix_tasks FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'admin') OR member_role_of(auth.uid(), company_id) = 'gestor'
  OR EXISTS (SELECT 1 FROM public.company_members m WHERE m.company_id = bitrix_tasks.company_id AND m.user_id = auth.uid() AND m.seller_ref = bitrix_tasks.responsible_id));