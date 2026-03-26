DROP INDEX IF EXISTS "companies_slug_idx";--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "companies_slug_active_idx" ON "companies" ("slug") WHERE "status" != 'archived';
