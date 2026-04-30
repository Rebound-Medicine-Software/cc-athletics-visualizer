import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  Settings as SettingsIcon,
  Palette,
  Plug,
  Users,
  Database,
  CreditCard,
  Menu,
  X,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useBranding } from "@/hooks/useBranding";
import { useEffectiveTeamId } from "@/lib/impersonation/useEffectiveTeamId";
import { ApiKeysTab } from "@/components/settings/ApiKeysTab";
import { DemonstrationsTab } from "@/components/settings/DemonstrationsTab";
import { DataHousingTab } from "@/components/settings/DataHousingTab";
import { AthleteCredentialsTab } from "@/components/settings/AthleteCredentialsTab";
import { StaffCredentialsTab } from "@/components/settings/StaffCredentialsTab";
import { TierManagementTab } from "@/components/settings/TierManagementTab";
import { BrandingTab } from "@/components/settings/BrandingTab";
import {
  UnsavedChangesProvider,
  useUnsavedChanges,
} from "@/components/settings/UnsavedChangesContext";
import { cn } from "@/lib/utils";

type SectionId =
  | "branding"
  | "api-keys"
  | "demonstrations"
  | "staff-credentials"
  | "athlete-credentials"
  | "data-housing"
  | "tier-management";

type Group = {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  sections: { id: SectionId; label: string; description: string }[];
};

const GROUPS: Group[] = [
  {
    id: "organisation",
    label: "Organisation",
    icon: Palette,
    description: "Brand identity and how your organisation appears.",
    sections: [
      { id: "branding", label: "Branding", description: "Colours, logo and typography." },
    ],
  },
  {
    id: "integrations",
    label: "Integrations",
    icon: Plug,
    description: "Connections to external systems and content.",
    sections: [
      { id: "api-keys", label: "API Keys", description: "Manage external API credentials." },
      { id: "demonstrations", label: "Demonstrations", description: "Exercise demo videos." },
    ],
  },
  {
    id: "people",
    label: "People & Access",
    icon: Users,
    description: "Practitioner and athlete credentials.",
    sections: [
      { id: "staff-credentials", label: "Staff Credentials", description: "Practitioner accounts and access." },
      { id: "athlete-credentials", label: "Athlete Credentials", description: "Athlete login credentials." },
    ],
  },
  {
    id: "data",
    label: "Data & Content",
    icon: Database,
    description: "Datasets and benchmarks.",
    sections: [
      { id: "data-housing", label: "Data Housing", description: "Region testing and elite athlete data." },
    ],
  },
  {
    id: "billing",
    label: "Billing / Tiers",
    icon: CreditCard,
    description: "Subscription tiers and packages.",
    sections: [
      { id: "tier-management", label: "Tier Management", description: "Manage subscription tiers." },
    ],
  },
];

const ALL_SECTIONS = GROUPS.flatMap((g) => g.sections.map((s) => ({ ...s, group: g })));

const SettingsInner = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { profile } = useAuth();
  const { teamId: effectiveTeamId, isImpersonating } = useEffectiveTeamId();
  const { branding } = useBranding(
    effectiveTeamId,
    isImpersonating ? "organisation" : profile?.role
  );
  const { guard, isDirty } = useUnsavedChanges();

  // Map legacy ?tab= param to new section ids
  const initialTab = searchParams.get("tab");
  const initial: SectionId = useMemo(() => {
    if (initialTab && ALL_SECTIONS.some((s) => s.id === initialTab)) return initialTab as SectionId;
    return "branding";
  }, [initialTab]);

  const [active, setActive] = useState<SectionId>(initial);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const setActiveGuarded = (id: SectionId) => {
    guard(() => {
      setActive(id);
      const next = new URLSearchParams(searchParams);
      next.set("tab", id);
      setSearchParams(next, { replace: true });
      setMobileNavOpen(false);
    });
  };

  const goBack = () => guard(() => navigate("/dashboard"));

  const activeMeta = ALL_SECTIONS.find((s) => s.id === active);

  const renderSection = () => {
    switch (active) {
      case "branding": return <BrandingTab />;
      case "api-keys": return <ApiKeysTab />;
      case "demonstrations": return <DemonstrationsTab />;
      case "staff-credentials": return <StaffCredentialsTab />;
      case "athlete-credentials": return <AthleteCredentialsTab />;
      case "data-housing": return <DataHousingTab />;
      case "tier-management": return <TierManagementTab />;
    }
  };

  return (
    <div
      className="min-h-screen p-3 sm:p-4"
      style={{
        background: branding?.primary_color
          ? `linear-gradient(135deg, ${branding.primary_color}15, hsl(var(--background)), ${branding.secondary_color || branding.primary_color}10)`
          : "linear-gradient(135deg, hsl(var(--primary) / 0.05), hsl(var(--background)), hsl(var(--secondary) / 0.1))",
        fontFamily: branding?.font_family || "Inter, system-ui, sans-serif",
      }}
    >
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-3 mb-6 flex-wrap">
          <Button variant="ghost" onClick={goBack} className="flex items-center gap-2">
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Back to Dashboard</span>
          </Button>
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <SettingsIcon className="w-5 h-5 sm:w-6 sm:h-6" />
            <h1 className="text-2xl sm:text-3xl font-bold truncate">Settings</h1>
          </div>
          {isDirty && (
            <span className="text-xs px-2 py-1 rounded bg-amber-100 text-amber-900 border border-amber-300">
              Unsaved changes
            </span>
          )}
          <Button
            variant="outline"
            size="sm"
            className="md:hidden"
            onClick={() => setMobileNavOpen((v) => !v)}
          >
            {mobileNavOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-[260px_1fr] gap-4">
          {/* Sidebar */}
          <aside
            className={cn(
              "rounded-lg border bg-card/95 backdrop-blur-sm shadow-sm p-2",
              mobileNavOpen ? "block" : "hidden md:block",
              "md:sticky md:top-4 md:self-start"
            )}
            style={{
              borderColor: branding?.primary_color ? `${branding.primary_color}30` : undefined,
            }}
          >
            <nav className="space-y-3">
              {GROUPS.map((group) => {
                const GroupIcon = group.icon;
                return (
                  <div key={group.id}>
                    <div className="flex items-center gap-2 px-2 pt-2 pb-1 text-xs uppercase tracking-wide text-muted-foreground">
                      <GroupIcon className="w-3.5 h-3.5" />
                      <span>{group.label}</span>
                    </div>
                    <div className="space-y-0.5">
                      {group.sections.map((s) => {
                        const isActive = active === s.id;
                        return (
                          <button
                            key={s.id}
                            onClick={() => setActiveGuarded(s.id)}
                            className={cn(
                              "w-full text-left px-3 py-2 rounded-md text-sm transition-colors",
                              isActive
                                ? "bg-primary/10 text-primary font-medium"
                                : "hover:bg-muted text-foreground"
                            )}
                          >
                            {s.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </nav>
          </aside>

          {/* Content */}
          <main
            className="rounded-lg border bg-card/95 backdrop-blur-sm shadow-sm p-4 sm:p-6"
            style={{
              borderColor: branding?.primary_color ? `${branding.primary_color}30` : undefined,
            }}
          >
            {activeMeta && (
              <div className="mb-4">
                <h2 className="text-xl font-semibold">{activeMeta.label}</h2>
                <p className="text-sm text-muted-foreground">{activeMeta.description}</p>
              </div>
            )}
            {renderSection()}
          </main>
        </div>
      </div>
    </div>
  );
};

const Settings = () => (
  <UnsavedChangesProvider>
    <SettingsInner />
  </UnsavedChangesProvider>
);

export default Settings;
