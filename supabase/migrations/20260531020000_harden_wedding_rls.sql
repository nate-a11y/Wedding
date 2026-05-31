-- Harden Wedding app tables in the shared Supabase project.
--
-- This migration intentionally targets only wedding-owned tables. LRP Bolt and
-- other Lake Ride Pros tables in the same Supabase project are not touched.
-- Public guest actions should flow through validated Next.js API routes that use
-- the server-only SUPABASE_SERVICE_ROLE_KEY client. The only direct browser
-- Supabase access retained here is guestbook media storage upload/read.

DO $$
DECLARE
  wedding_tables text[] := ARRAY[
    'rsvps',
    'guestbook',
    'photos',
    'guest_addresses',
    'emails',
    'budget_categories',
    'budget_settings',
    'vendors',
    'expenses',
    'gifts',
    'tasks',
    'timeline_events',
    'microsoft_auth',
    'guest_events',
    'guest_tags',
    'email_campaigns',
    'email_sends',
    'reminder_settings',
    'guest_reminder_log',
    'rsvp_event_responses',
    'live_updates',
    'push_subscriptions',
    'song_requests',
    'song_votes',
    'vendor_portal_tokens',
    'seating_assignments',
    'seating_tables'
  ];
  table_name text;
  policy_record record;
BEGIN
  FOREACH table_name IN ARRAY wedding_tables LOOP
    IF to_regclass(format('public.%I', table_name)) IS NULL THEN
      RAISE NOTICE 'Skipping missing wedding table public.%', table_name;
      CONTINUE;
    END IF;

    -- Remove older broad policies like USING (true) / WITH CHECK (true).
    FOR policy_record IN
      SELECT policyname
      FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = table_name
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', policy_record.policyname, table_name);
    END LOOP;

    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_name);

    -- Remove direct browser access to wedding-owned tables. API routes use
    -- the service role client after validating auth/rate limits/payloads.
    EXECUTE format('REVOKE ALL ON TABLE public.%I FROM anon', table_name);
    EXECUTE format('REVOKE ALL ON TABLE public.%I FROM authenticated', table_name);
    EXECUTE format('GRANT ALL ON TABLE public.%I TO service_role', table_name);

    EXECUTE format(
      'CREATE POLICY %I ON public.%I TO service_role USING (true) WITH CHECK (true)',
      'wedding_service_role_all',
      table_name
    );
  END LOOP;
END $$;

-- Direct browser storage access is still used by the Guest Book page for short
-- audio/video uploads before the validated /api/guestbook insert.
DROP POLICY IF EXISTS "Allow public uploads to guestbook media" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read access to guestbook media" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated delete of guestbook media" ON storage.objects;
DROP POLICY IF EXISTS "Wedding guestbook media public uploads" ON storage.objects;
DROP POLICY IF EXISTS "Wedding guestbook media public reads" ON storage.objects;
DROP POLICY IF EXISTS "Wedding guestbook media service role management" ON storage.objects;

CREATE POLICY "Wedding guestbook media public uploads"
ON storage.objects FOR INSERT
TO anon, authenticated
WITH CHECK (bucket_id = 'guestbook-media');

CREATE POLICY "Wedding guestbook media public reads"
ON storage.objects FOR SELECT
TO anon, authenticated
USING (bucket_id = 'guestbook-media');

CREATE POLICY "Wedding guestbook media service role management"
ON storage.objects
TO service_role
USING (bucket_id = 'guestbook-media')
WITH CHECK (bucket_id = 'guestbook-media');
