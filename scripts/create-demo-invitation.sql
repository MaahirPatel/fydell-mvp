-- Create the FYDELL-DEMO open invitation.
-- Run this in the Supabase SQL editor on the production project.
-- It creates a reusable demo invitation: anyone who pastes FYDELL-DEMO
-- gets their own simulation session. Blank candidate_email = open to all.

-- SHA256('FYDELL-DEMO') = b6f4b393b40e92c6f2f6c96803256070a86825b747fa9e64d4817f93f1399358

WITH org AS (
  SELECT id FROM public.organizations ORDER BY created_at ASC LIMIT 1
),
tmpl AS (
  SELECT id, current_version_id
  FROM public.sim_templates
  WHERE status = 'published'
  ORDER BY created_at ASC LIMIT 1
)
INSERT INTO public.sim_invitations (
  organization_id, template_id, template_version_id,
  candidate_email, candidate_name,
  token_hash, status, expires_at
)
SELECT
  org.id, tmpl.id, tmpl.current_version_id,
  '', 'Demo candidate',
  'b6f4b393b40e92c6f2f6c96803256070a86825b747fa9e64d4817f93f1399358',
  'sent',
  now() + interval '90 days'
FROM org, tmpl
ON CONFLICT (token_hash) DO NOTHING
RETURNING id, token_hash, expires_at;
