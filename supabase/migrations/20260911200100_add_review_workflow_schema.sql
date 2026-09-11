-- Add review workflow schema (Section 4, Item 1: "Submit for review" sub-item)
-- Schema-only groundwork for the specced workflow: a practitioner can submit a
-- client's test result for org-admin approval before it becomes visible on the
-- athlete-facing progress view. This migration adds the two columns the future
-- UI/RPC work will read and write. It does not change any RLS policy and does
-- not filter any existing query, so current app behaviour is unaffected until
-- a follow-up PR wires up the admin toggle UI and the athlete-facing filter.

-- Per-organisation toggle (surfaced in org admin settings later). Defaults to
-- false so nothing changes for any team until an admin explicitly turns it on.
ALTER TABLE public.teams
  ADD COLUMN IF NOT EXISTS review_workflow_enabled BOOLEAN NOT NULL DEFAULT false;

-- Per-result review status. Defaults to 'approved' so every existing row, and
-- every new row for a team that never enables the toggle, stays visible
-- exactly as it is today ("pre-existing results auto-approved" per spec).
ALTER TABLE public.test_data
  ADD COLUMN IF NOT EXISTS review_status TEXT NOT NULL DEFAULT 'approved';

ALTER TABLE public.test_data
  DROP CONSTRAINT IF EXISTS test_data_review_status_check;

ALTER TABLE public.test_data
  ADD CONSTRAINT test_data_review_status_check
  CHECK (review_status IN ('pending', 'approved', 'rejected'));

CREATE INDEX IF NOT EXISTS idx_test_data_review_status
  ON public.test_data(review_status);

COMMENT ON COLUMN public.teams.review_workflow_enabled IS 'When true, new test results for this org require admin approval before becoming visible to the athlete (Section 4 Item 1 submit-for-review workflow). Off by default.';

COMMENT ON COLUMN public.test_data.review_status IS 'pending | approved | rejected. Only meaningful when the owning team has review_workflow_enabled = true. Defaults to approved so nothing changes for teams that never turn the workflow on.';
