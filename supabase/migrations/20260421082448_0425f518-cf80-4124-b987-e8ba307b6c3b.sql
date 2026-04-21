-- Track user login events for active user metrics
CREATE TABLE public.login_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  team_id UUID,
  role TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_login_events_team_created ON public.login_events(team_id, created_at DESC);
CREATE INDEX idx_login_events_user_created ON public.login_events(user_id, created_at DESC);
CREATE INDEX idx_login_events_role_created ON public.login_events(role, created_at DESC);

ALTER TABLE public.login_events ENABLE ROW LEVEL SECURITY;

-- Users can insert their own login events
CREATE POLICY "Users can record their own logins"
  ON public.login_events FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Team members (practitioners/orgs) can view events for their team; super admins see everything
CREATE POLICY "Team members view team login events"
  ON public.login_events FOR SELECT
  TO authenticated
  USING (
    team_id = public.get_my_team_id()
    OR public.get_my_role() = 'super_admin'
  );

-- Social engagement snapshots (cached fetches from Meta Graph API)
CREATE TABLE public.social_engagement_snapshots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID,
  platform TEXT NOT NULL,
  followers INTEGER DEFAULT 0,
  reach INTEGER DEFAULT 0,
  impressions INTEGER DEFAULT 0,
  engagement INTEGER DEFAULT 0,
  recent_posts JSONB DEFAULT '[]'::jsonb,
  fetched_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_social_snapshots_team_platform ON public.social_engagement_snapshots(team_id, platform, fetched_at DESC);

ALTER TABLE public.social_engagement_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team members view team social snapshots"
  ON public.social_engagement_snapshots FOR SELECT
  TO authenticated
  USING (
    team_id = public.get_my_team_id()
    OR public.get_my_role() = 'super_admin'
  );

CREATE POLICY "Service role manages social snapshots"
  ON public.social_engagement_snapshots FOR ALL
  USING (auth.role() = 'service_role');