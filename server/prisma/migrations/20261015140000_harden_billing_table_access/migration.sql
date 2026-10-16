-- These billing/payment tables are accessed through the authenticated server API,
-- not directly by Supabase's anon or authenticated Data API roles.
REVOKE ALL PRIVILEGES ON TABLE
  public."BillingCharge",
  public."PaymentAttempt",
  public."BillingWebhookEvent"
FROM PUBLIC, anon, authenticated;

ALTER TABLE public."BillingCharge" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."PaymentAttempt" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."BillingWebhookEvent" ENABLE ROW LEVEL SECURITY;
