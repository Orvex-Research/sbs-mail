-- 1. Create the emails table
CREATE TABLE IF NOT EXISTS public.emails (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    to_email TEXT NOT NULL,
    from_header TEXT,
    subject TEXT,
    body_html TEXT,
    body_text TEXT,
    snippet TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (now() + interval '1 hour') NOT NULL
);

-- 2. Create the domains table (for custom domains added by users)
CREATE TABLE IF NOT EXISTS public.domains (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    domain TEXT NOT NULL UNIQUE,
    imap_email TEXT,
    imap_password TEXT,
    is_public BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Indexing
CREATE INDEX IF NOT EXISTS idx_emails_to_email ON public.emails (to_email);
CREATE INDEX IF NOT EXISTS idx_emails_expires_at ON public.emails (expires_at);

-- 3. Enable RLS
ALTER TABLE public.emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.domains ENABLE ROW LEVEL SECURITY;

-- 4. Policies
CREATE POLICY "Service role can do everything on emails" ON public.emails FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public can read emails" ON public.emails FOR SELECT USING (true);

CREATE POLICY "Users can manage their own domains" ON public.domains FOR ALL 
    USING (auth.uid() = user_id) 
    WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Public can see public domains" ON public.domains FOR SELECT USING (is_public = true);

-- 5. Auto-delete function
CREATE OR REPLACE FUNCTION delete_expired_emails()
RETURNS void AS $$
BEGIN
    DELETE FROM public.emails WHERE expires_at < now();
END;
$$ LANGUAGE plpgsql;

-- 6. Schedule the cleanup (Run this if you have pg_cron enabled)
-- SELECT cron.schedule('delete-emails-every-minute', '* * * * *', 'SELECT delete_expired_emails()');
