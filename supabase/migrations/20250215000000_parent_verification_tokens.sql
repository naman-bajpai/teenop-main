-- Parent verification tokens: used when a teen signs up; parent receives email
-- and must confirm before the teen account becomes active.
CREATE TABLE IF NOT EXISTS public.parent_verification_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_parent_verification_tokens_token ON public.parent_verification_tokens(token);
CREATE INDEX IF NOT EXISTS idx_parent_verification_tokens_expires_at ON public.parent_verification_tokens(expires_at);

COMMENT ON TABLE public.parent_verification_tokens IS 'One-time tokens for parent/guardian to verify and activate a teen account.';
