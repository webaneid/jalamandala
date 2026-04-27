ALTER TABLE "expo_events" ADD COLUMN IF NOT EXISTS "invoice_due_days" integer NOT NULL DEFAULT 1;
