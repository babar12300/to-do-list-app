CREATE TABLE public.profiles (
 id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
 display_name text NOT NULL DEFAULT '',
 avatar_path text,
 created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read own profile" ON public.profiles FOR SELECT TO authenticated USING (id = (SELECT auth.uid()));
CREATE POLICY "Create own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = (SELECT auth.uid()));
CREATE POLICY "Update own profile" ON public.profiles FOR UPDATE TO authenticated USING (id = (SELECT auth.uid())) WITH CHECK (id = (SELECT auth.uid()));
CREATE POLICY "Delete own profile" ON public.profiles FOR DELETE TO authenticated USING (id = (SELECT auth.uid()));
CREATE FUNCTION public.create_wallpaper_profile() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
 INSERT INTO public.profiles (id, display_name) VALUES (NEW.id, left(coalesce(NEW.raw_user_meta_data->>'full_name', ''), 100)) ON CONFLICT (id) DO NOTHING;
 RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.create_wallpaper_profile() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER create_wallpaper_profile_after_signup AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.create_wallpaper_profile();
CREATE POLICY "Read own personal images" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'personal-images' AND (storage.foldername(name))[1] = (SELECT auth.uid())::text);
CREATE POLICY "Upload own personal images" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'personal-images' AND (storage.foldername(name))[1] = (SELECT auth.uid())::text);
CREATE POLICY "Update own personal images" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'personal-images' AND (storage.foldername(name))[1] = (SELECT auth.uid())::text) WITH CHECK (bucket_id = 'personal-images' AND (storage.foldername(name))[1] = (SELECT auth.uid())::text);
CREATE POLICY "Delete own personal images" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'personal-images' AND (storage.foldername(name))[1] = (SELECT auth.uid())::text);