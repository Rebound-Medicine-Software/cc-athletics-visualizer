import { useEffect, useMemo, useState, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { useAuth } from "@/contexts/AuthContext";
import { useImpersonation } from "@/lib/impersonation/ImpersonationContext";
import { toast } from "sonner";
import {
  Activity,
  BarChart3,
  Bell,
  Building2,
  Calendar,
  CalendarRange,
  CreditCard,
  Dumbbell,
  FileText,
  HeartPulse,
  Home,
  LayoutDashboard,
  LifeBuoy,
  LogOut,
  Plug,
  Search,
  Settings as SettingsIcon,
  Shield,
  ShieldCheck,
  UserCircle,
  UserPlus,
  Users,
  type LucideIcon,
} from "lucide-react";

type Cmd = {
  id: string;
  label: string;
  hint?: string;
  icon: LucideIcon;
  group: string;
  keywords?: string;
  perform: () => void;
};

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const CommandPalette = ({ open, onOpenChange }: CommandPaletteProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { profile, signOut } = useAuth();
  // Impersonation hook may be unavailable for unauthenticated users; guard.
  let impersonation: ReturnType<typeof useImpersonation> | null = null;
  try {
    impersonation = useImpersonation();
  } catch {
    impersonation = null;
  }

  const role = profile?.role;
  const isImpersonating = !!impersonation?.impersonation;

  const close = useCallback(() => onOpenChange(false), [onOpenChange]);

  const go = useCallback(
    (path: string) => {
      close();
      navigate(path);
    },
    [navigate, close]
  );

  // Navigate to a Dashboard section via ?section=
  const goSection = useCallback(
    (section: string) => {
      close();
      const params = new URLSearchParams(location.search);
      params.set("section", section);
      const target = role === "client" ? "/Dashboard(Client)" : "/dashboard";
      navigate(`${target}?${params.toString()}`);
    },
    [navigate, close, location.search, role]
  );

  const commands: Cmd[] = useMemo(() => {
    if (!profile) return [];
    const list: Cmd[] = [];

    // ---- Super Admin
    if (role === "super_admin") {
      list.push(
        { id: "cc-dashboard", label: "Global Dashboard", icon: LayoutDashboard, group: "Control Centre", perform: () => go("/control-centre") },
        { id: "cc-health", label: "Platform Health", icon: HeartPulse, group: "Control Centre", perform: () => go("/control-centre") },
        { id: "cc-orgs", label: "Organisations", icon: Building2, group: "Control Centre", keywords: "tenants search", perform: () => go("/control-centre") },
        { id: "cc-users", label: "Users & Practitioners", icon: Users, group: "Control Centre", perform: () => go("/control-centre") },
        { id: "cc-athletes", label: "Athletes Global Registry", icon: UserCircle, group: "Control Centre", perform: () => go("/control-centre") },
        { id: "cc-live", label: "Live Testing Data Monitor", icon: Activity, group: "Control Centre", perform: () => go("/control-centre") },
        { id: "cc-analytics", label: "Analytics Warehouse", icon: BarChart3, group: "Control Centre", perform: () => go("/control-centre") },
        { id: "cc-bookings", label: "Bookings Infrastructure", icon: CalendarRange, group: "Control Centre", perform: () => go("/control-centre") },
        { id: "cc-reports", label: "Reports & AI Engine", icon: FileText, group: "Control Centre", perform: () => go("/control-centre") },
        { id: "cc-billing", label: "Billing / Tiers / Revenue", icon: CreditCard, group: "Control Centre", perform: () => go("/control-centre") },
        { id: "cc-integrations", label: "API & Integrations", icon: Plug, group: "Control Centre", perform: () => go("/control-centre") },
        { id: "cc-compliance", label: "Compliance / Audit Logs", icon: ShieldCheck, group: "Control Centre", keywords: "audit", perform: () => go("/control-centre") },
        { id: "cc-notifs", label: "Notifications Centre", icon: Bell, group: "Control Centre", perform: () => go("/control-centre") },
        { id: "cc-support", label: "Support Desk", icon: LifeBuoy, group: "Control Centre", perform: () => go("/control-centre") },
        { id: "cc-settings", label: "Platform Settings", icon: SettingsIcon, group: "Control Centre", perform: () => go("/control-centre") },
      );
    }

    // ---- Organisation Admin
    if (role === "organisation") {
      list.push(
        { id: "org-home", label: "Home", icon: Home, group: "Navigate", perform: () => goSection("home") },
        { id: "org-analytics", label: "Analytics", icon: BarChart3, group: "Navigate", perform: () => goSection("dashboard") },
        { id: "org-live", label: "Live Data", icon: Activity, group: "Navigate", perform: () => goSection("live-data") },
        { id: "org-bookings", label: "Bookings", icon: Calendar, group: "Navigate", perform: () => goSection("bookings") },
        { id: "org-profiles", label: "Profiles", icon: Users, group: "Navigate", perform: () => goSection("profiles") },
        { id: "org-reports", label: "Reports", icon: FileText, group: "Navigate", perform: () => goSection("reports") },
        { id: "org-programming", label: "Programming", icon: Dumbbell, group: "Navigate", perform: () => goSection("programming") },
        { id: "org-payment", label: "Payment Packages", icon: CreditCard, group: "Navigate", perform: () => goSection("payment") },
        { id: "org-settings", label: "Settings", icon: SettingsIcon, group: "Navigate", perform: () => go("/settings") },
        // Quick actions
        { id: "qa-add-athlete", label: "Add athlete", icon: UserPlus, group: "Quick actions", keywords: "create new", perform: () => goSection("profiles") },
        { id: "qa-invite-pract", label: "Invite practitioner", icon: UserPlus, group: "Quick actions", perform: () => goSection("profiles") },
        { id: "qa-create-booking", label: "Create booking", icon: Calendar, group: "Quick actions", perform: () => goSection("bookings") },
        { id: "qa-generate-report", label: "Generate report", icon: FileText, group: "Quick actions", perform: () => goSection("reports") },
      );
    }

    // ---- Practitioner / Clinician
    if (role === "clinician") {
      list.push(
        { id: "pr-home", label: "My Day", icon: Home, group: "Navigate", keywords: "home today", perform: () => goSection("home") },
        { id: "pr-bookings", label: "Bookings", icon: Calendar, group: "Navigate", perform: () => goSection("bookings") },
        { id: "pr-athletes", label: "Athletes", icon: Users, group: "Navigate", keywords: "profiles", perform: () => goSection("profiles") },
        { id: "pr-live", label: "Live Data", icon: Activity, group: "Navigate", perform: () => goSection("live-data") },
        { id: "pr-reports", label: "Reports", icon: FileText, group: "Navigate", perform: () => goSection("reports") },
        { id: "pr-settings", label: "Settings", icon: SettingsIcon, group: "Navigate", perform: () => go("/settings") },
        { id: "qa-create-booking-p", label: "Create booking", icon: Calendar, group: "Quick actions", perform: () => goSection("bookings") },
        { id: "qa-generate-report-p", label: "Generate report", icon: FileText, group: "Quick actions", perform: () => goSection("reports") },
      );
    }

    // ---- Client
    if (role === "client") {
      list.push(
        { id: "cl-progress", label: "Progress", icon: BarChart3, group: "Navigate", perform: () => goSection("progress") },
        { id: "cl-bookings", label: "Bookings", icon: Calendar, group: "Navigate", perform: () => goSection("bookings") },
        { id: "cl-reports", label: "Reports", icon: FileText, group: "Navigate", perform: () => goSection("reports") },
        { id: "cl-notifs", label: "Notifications", icon: Bell, group: "Navigate", perform: () => goSection("notifications") },
        { id: "cl-settings", label: "Settings", icon: SettingsIcon, group: "Navigate", perform: () => go("/settings") },
      );
    }

    // ---- Impersonation controls (Super Admin only)
    if (role === "super_admin") {
      if (isImpersonating) {
        list.push({
          id: "imp-end",
          label: "End View-As session",
          icon: Shield,
          group: "Session",
          keywords: "stop impersonation",
          perform: async () => {
            close();
            try {
              await impersonation?.endImpersonation();
              toast.success("View-As ended");
            } catch {
              toast.error("Failed to end View-As");
            }
          },
        });
      } else {
        list.push({
          id: "imp-start",
          label: "Start View-As (open Organisations)",
          icon: Shield,
          group: "Session",
          keywords: "impersonate",
          perform: () => go("/control-centre"),
        });
      }
    }

    // ---- Universal
    list.push({
      id: "logout",
      label: "Sign out",
      icon: LogOut,
      group: "Session",
      keywords: "logout exit",
      perform: async () => {
        close();
        await signOut();
        navigate("/auth");
      },
    });

    return list;
  }, [profile, role, isImpersonating, impersonation, go, goSection, close, signOut, navigate]);

  // Group commands
  const grouped = useMemo(() => {
    const map = new Map<string, Cmd[]>();
    for (const c of commands) {
      if (!map.has(c.group)) map.set(c.group, []);
      map.get(c.group)!.push(c);
    }
    return Array.from(map.entries());
  }, [commands]);

  if (!profile) return null;

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Type a command or search…" />
      <CommandList>
        <CommandEmpty>
          <div className="flex flex-col items-center gap-2 py-6 text-muted-foreground">
            <Search className="h-5 w-5" />
            <p className="text-sm">No matching commands</p>
            <p className="text-xs">Try a page name or action</p>
          </div>
        </CommandEmpty>
        {grouped.map(([group, items], idx) => (
          <div key={group}>
            {idx > 0 && <CommandSeparator />}
            <CommandGroup heading={group}>
              {items.map((c) => {
                const Icon = c.icon;
                return (
                  <CommandItem
                    key={c.id}
                    value={`${c.label} ${c.keywords ?? ""} ${c.group}`}
                    onSelect={c.perform}
                  >
                    <Icon className="mr-2 h-4 w-4" />
                    <span>{c.label}</span>
                    {c.hint && (
                      <span className="ml-auto text-xs text-muted-foreground">{c.hint}</span>
                    )}
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </div>
        ))}
      </CommandList>
    </CommandDialog>
  );
};

/** Provider that owns the global Cmd/Ctrl+K shortcut and mounts the palette. */
export const GlobalCommandPalette = () => {
  const [open, setOpen] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && (e.key === "k" || e.key === "K")) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    // Custom event so any header button can open the palette without prop drilling
    const onOpen = () => setOpen(true);
    window.addEventListener("nh:open-command-palette", onOpen);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("nh:open-command-palette", onOpen);
    };
  }, [user]);

  if (!user) return null;
  return <CommandPalette open={open} onOpenChange={setOpen} />;
};
