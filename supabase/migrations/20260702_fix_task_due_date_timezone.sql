-- ============================================================
-- Migration: fix timezone offset on existing task.due_date rows
-- ============================================================
--
-- Background:
--   The previous client code stored task due dates as UTC midnight via
--   `new Date("YYYY-MM-DD")` in JavaScript. Per the ECMAScript spec,
--   date-only strings are parsed as UTC. In non-UTC timezones, this
--   caused an off-by-one display bug (e.g., users in America/Caracas
--   UTC-4 saw tasks dated "2026-07-02" on "2026-07-01").
--
--   The new code (see entity-mapper.ts and the form submit handlers)
--   uses local-midnight Dates (`parseDate` / `toISOStringDate`) so the
--   device's local calendar date is the source of truth.
--
-- What this migration does:
--   Shifts existing task.due_date rows that are exactly at UTC midnight
--   by the user's timezone offset, so the local calendar date that
--   displays matches the date the user originally picked.
--
--   - Users EAST of UTC (offset > 0): the old data was already correct
--     (UTC midnight in their zone is the same day in the morning). No
--     shift is needed; rows are skipped.
--   - Users WEST of UTC (offset < 0): the old data was off by |offset|
--     hours. Rows are shifted forward by |offset|.
--   - Users in UTC (offset = 0): no shift needed; rows are skipped.
--
-- Safety:
--   The WHERE clause only matches rows whose due_date is exactly at
--   UTC midnight (the bug pattern). Rows with non-midnight timestamps
--   are left untouched in case they were set intentionally.

BEGIN;

UPDATE public.tasks t
SET due_date = t.due_date + (
    ABS(EXTRACT(EPOCH FROM (NOW() AT TIME ZONE COALESCE(p.timezone, 'UTC')))
      - EXTRACT(EPOCH FROM (NOW() AT TIME ZONE 'UTC')))
    * INTERVAL '1 second'
)
FROM public.profiles p
WHERE t.user_id = p.id
  AND t.due_date IS NOT NULL
  AND t.due_date = date_trunc('day', t.due_date AT TIME ZONE 'UTC') AT TIME ZONE 'UTC'
  AND COALESCE(p.timezone, 'UTC') <> 'UTC'
  AND (NOW() AT TIME ZONE COALESCE(p.timezone, 'UTC')) < (NOW() AT TIME ZONE 'UTC');

COMMIT;
