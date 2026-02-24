-- Zentra: run this in Supabase SQL Editor (Dashboard → SQL Editor → New query)

-- 1. Users table (sync with Supabase Auth via trigger or backend)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  credits INTEGER NOT NULL DEFAULT 50,
  subscription_status TEXT NOT NULL DEFAULT 'free' CHECK (subscription_status IN ('free', 'active', 'cancelled')),
  credits_reset_at DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Zentra scores
CREATE TABLE IF NOT EXISTS public.zentra_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  income NUMERIC NOT NULL DEFAULT 0,
  expenses NUMERIC NOT NULL DEFAULT 0,
  savings NUMERIC NOT NULL DEFAULT 0,
  debt NUMERIC NOT NULL DEFAULT 0,
  score NUMERIC NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. RLS (Row Level Security)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.zentra_scores ENABLE ROW LEVEL SECURITY;

-- Users: allow read/insert for authenticated (backend uses service role or anon with JWT)
CREATE POLICY "Users read own" ON public.users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users insert own" ON public.users FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users update own" ON public.users FOR UPDATE USING (auth.uid() = id);

-- Service role can do everything; for backend using anon key + JWT, the user can only see/update own row.
-- If your backend uses the service_role key, RLS is bypassed. If using anon key, these policies apply to the authenticated user.

-- Zentra scores: user can only see/insert own
CREATE POLICY "Scores read own" ON public.zentra_scores FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Scores insert own" ON public.zentra_scores FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 4. Optional: trigger to create user row on first sign-up (if you prefer server-side creation, skip this)
-- Our backend ensure_user() creates the row on first /me or /chat, so this trigger is optional.
-- CREATE OR REPLACE FUNCTION public.handle_new_user()
-- RETURNS TRIGGER AS $$
-- BEGIN
--   INSERT INTO public.users (id, email, credits, subscription_status, credits_reset_at)
--   VALUES (NEW.id, NEW.email, 50, 'free', (DATE_TRUNC('month', NOW()) + INTERVAL '1 month')::DATE);
--   RETURN NEW;
-- END;
-- $$ LANGUAGE plpgsql SECURITY DEFINER;
-- CREATE TRIGGER on_auth_user_created
--   AFTER INSERT ON auth.users
--   FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 5. Credits reset: set default credits_reset_at for existing rows if null
UPDATE public.users SET credits_reset_at = (DATE_TRUNC('month', NOW()) + INTERVAL '1 month')::DATE WHERE credits_reset_at IS NULL;
