CREATE TABLE public.account_plans (
 user_id uuid PRIMARY KEY,
 tasks jsonb NOT NULL DEFAULT '[]'::jsonb,
 lists jsonb NOT NULL DEFAULT '[]'::jsonb,
 revision bigint NOT NULL DEFAULT 0,
 updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.account_plans TO authenticated;
GRANT ALL ON public.account_plans TO service_role;
ALTER TABLE public.account_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read own plan" ON public.account_plans FOR SELECT TO authenticated USING (user_id = (SELECT auth.uid()));
CREATE POLICY "Create own plan" ON public.account_plans FOR INSERT TO authenticated WITH CHECK (user_id = (SELECT auth.uid()));
CREATE POLICY "Update own plan" ON public.account_plans FOR UPDATE TO authenticated USING (user_id = (SELECT auth.uid())) WITH CHECK (user_id = (SELECT auth.uid()));
CREATE FUNCTION public.save_account_plan(expected_revision bigint, new_tasks jsonb, new_lists jsonb)
RETURNS SETOF public.account_plans LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in required'; END IF;
 IF jsonb_typeof(new_tasks) <> 'array' OR jsonb_typeof(new_lists) <> 'array' THEN RAISE EXCEPTION 'Invalid plan'; END IF;
 INSERT INTO public.account_plans(user_id) VALUES (auth.uid()) ON CONFLICT (user_id) DO NOTHING;
 RETURN QUERY UPDATE public.account_plans SET tasks = new_tasks, lists = new_lists, revision = revision + 1, updated_at = now()
 WHERE user_id = auth.uid() AND revision = expected_revision RETURNING *;
END; $$;
REVOKE ALL ON FUNCTION public.save_account_plan(bigint, jsonb, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.save_account_plan(bigint, jsonb, jsonb) TO authenticated;