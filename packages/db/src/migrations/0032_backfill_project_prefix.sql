-- Backfill issue_prefix for existing projects that don't have one.
-- Uses first 3 uppercase letters of the project name, falling back to 'PRJ'.
UPDATE projects
SET issue_prefix = UPPER(LEFT(REGEXP_REPLACE(name, '[^a-zA-Z]', '', 'g'), 3))
WHERE issue_prefix IS NULL
  AND archived_at IS NULL
  AND LENGTH(REGEXP_REPLACE(name, '[^a-zA-Z]', '', 'g')) >= 3;

UPDATE projects
SET issue_prefix = 'PRJ'
WHERE issue_prefix IS NULL
  AND archived_at IS NULL;
