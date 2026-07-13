-- Post-migration bootstrap: platform operator + organization wallet
--
-- Run once after migrations on a fresh database (local `supabase start` or hosted
-- `db push`). Customize the organization name for your deployment.
--
-- Creates:
--   1. One PLATFORM_OPERATOR organization (register #22; partial unique index)
--   2. That organization's wallet (1:1 via wallets.organization_id)
--
-- Payments: customer top-ups use a separate BANKING_SYSTEM wallet — configure that
-- when enabling the payments capability (deployment.systemWalletId in config).

WITH new_org AS (
	INSERT INTO public.organizations (name, organization_type)
	VALUES ('Platform Operator', 'PLATFORM_OPERATOR')
	RETURNING id
)
INSERT INTO public.wallets (organization_id)
SELECT id FROM new_org
RETURNING id AS wallet_id, organization_id;

-- Verify bootstrap rows
SELECT o.id, o.name, o.organization_type, w.id AS wallet_id
FROM public.organizations AS o
JOIN public.wallets AS w ON w.organization_id = o.id
WHERE o.organization_type = 'PLATFORM_OPERATOR';
