-- Create clients table for Consumer 2 management
CREATE TABLE public.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
  assigned_therapist_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  tier_id UUID REFERENCES public.tiers(id) ON DELETE SET NULL,
  stripe_status TEXT DEFAULT 'inactive',
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create bookings table for appointment management
CREATE TABLE public.bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
  therapist_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
  appointment_date TIMESTAMPTZ NOT NULL,
  status TEXT DEFAULT 'scheduled',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create messages table for support and communication
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  to_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
  subject TEXT,
  message_body TEXT NOT NULL,
  status TEXT DEFAULT 'unread',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create platform_metrics table for Super Admin dashboard
CREATE TABLE public.platform_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_name TEXT NOT NULL,
  metric_value NUMERIC NOT NULL,
  metric_date DATE DEFAULT CURRENT_DATE,
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on all new tables
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_metrics ENABLE ROW LEVEL SECURITY;

-- RLS Policies for clients table
CREATE POLICY "Super admins can manage all clients" ON public.clients
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND role = 'super_admin'
  )
);

CREATE POLICY "Practitioners can manage their team clients" ON public.clients
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.teams t, public.profiles p
    WHERE t.id = clients.team_id 
    AND t.admin_id = auth.uid()
    AND p.user_id = auth.uid() 
    AND p.role = 'practitioner'
  )
);

CREATE POLICY "Clients can view their own data" ON public.clients
FOR SELECT USING (user_id = auth.uid());

-- RLS Policies for bookings table
CREATE POLICY "Super admins can manage all bookings" ON public.bookings
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND role = 'super_admin'
  )
);

CREATE POLICY "Practitioners can manage their team bookings" ON public.bookings
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.teams t
    WHERE t.id = bookings.team_id AND t.admin_id = auth.uid()
  ) OR therapist_id = auth.uid()
);

CREATE POLICY "Clients can view their own bookings" ON public.bookings
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.clients c
    WHERE c.id = bookings.client_id AND c.user_id = auth.uid()
  )
);

-- RLS Policies for messages table
CREATE POLICY "Super admins can manage all messages" ON public.messages
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND role = 'super_admin'
  )
);

CREATE POLICY "Users can view messages sent to or from them" ON public.messages
FOR SELECT USING (from_user_id = auth.uid() OR to_user_id = auth.uid());

CREATE POLICY "Users can send messages" ON public.messages
FOR INSERT WITH CHECK (from_user_id = auth.uid());

-- RLS Policies for platform_metrics table
CREATE POLICY "Super admins can manage all platform metrics" ON public.platform_metrics
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND role = 'super_admin'
  )
);

CREATE POLICY "Practitioners can view their team metrics" ON public.platform_metrics
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.teams t
    WHERE t.id = platform_metrics.team_id AND t.admin_id = auth.uid()
  )
);

-- Add triggers for updated_at columns
CREATE TRIGGER update_clients_updated_at
  BEFORE UPDATE ON public.clients
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_bookings_updated_at
  BEFORE UPDATE ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_messages_updated_at
  BEFORE UPDATE ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();