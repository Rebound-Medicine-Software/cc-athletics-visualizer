import { useState } from "react";
import { HighlightsSection } from "./HighlightsSection";
import { ReportFilters } from "./ReportFilters";
import { RegionComparison } from "./RegionComparison";
import { IndividualComparisonSection } from "./IndividualComparisonSection";
import { EliteComparison } from "./EliteComparison";

import { LiveDataSection } from "./LiveDataSection";
import { BookingCalendar } from "./BookingCalendar";
import { StaffCredentialsTab } from "@/components/settings/StaffCredentialsTab";
import { HomeOverview } from "./home/HomeOverview";
import { ComingSoonSection } from "./ComingSoonSection";
import { SectionHeader } from "./SectionHeader";
import { EmptyState } from "./EmptyState";
import { ErrorState } from "./ErrorState";
import { BarChart3, Activity } from "lucide-react";

export interface DashboardContentProps {
  data: any[];
  isLoading: boolean;
  error: Error | null;
  errorMessage: string;
  hasNoData: boolean;
  selectedTeams: string[];
  setSelectedTeams: (teams: string[]) => void;
  handleRefresh: () => void;
  orgData: any;
  branding?: any;
  navigationItems: any[];
  activeSection: string;
  setActiveSection?: (section: string) => void;
  resetFiltersKey: number;
}

// Sections that depend on force-plate test data
const DATA_DEPENDENT_SECTIONS = new Set(["dashboard", "live-data"]);

export const DashboardContent = ({
  data, isLoading, error, errorMessage, hasNoData,
  selectedTeams, setSelectedTeams, handleRefresh, orgData,
  branding, navigationItems, activeSection, setActiveSection, resetFiltersKey
}: DashboardContentProps) => {
  // State for remaining section
  const [selectedTest2, setSelectedTest2] = useState<string>("");
  const [resetKey2, setResetKey2] = useState<number>(0);

  const dataDependent = DATA_DEPENDENT_SECTIONS.has(activeSection);

  // Error state — only blocks data-dependent sections
  if (error && dataDependent) {
    return (
      <ErrorState
        variant="load-failed"
        description={errorMessage || "We couldn't load your testing data. Please try again."}
        onRetry={handleRefresh}
      />
    );
  }

  // No data state — only blocks data-dependent sections
  if (hasNoData && dataDependent) {
    return (
      <EmptyState
        icon={activeSection === "live-data" ? Activity : BarChart3}
        title="No test results yet"
        description="Once your team uploads or syncs force-plate testing data, your dashboards, charts, and comparisons will populate here automatically."
        primaryAction={{
          label: "Refresh data",
          onClick: handleRefresh,
        }}
        secondaryAction={{
          label: "Connect an integration",
          href: "/settings",
          variant: "outline",
        }}
      />
    );
  }

  // Filter data for Pogo tests and other test types (excluding jump/isometric)
  const sectionData = data.filter(d => 
    d.test_type === 'pogo' || (d.test_type !== 'jump' && d.test_type !== 'isometric')
  );
  const filteredData = selectedTeams.length === 0
    ? sectionData
    : sectionData.filter(d => selectedTeams.includes(d.team_name));
  
  // Render different sections based on activeSection
  const renderContent = () => {
    switch (activeSection) {
      case "home":
        return <HomeOverview setActiveSection={setActiveSection} />;
      case "live-data":
        return (
          <div className="space-y-4">
            <SectionHeader
              title="Live Data"
              description="Real-time force-plate streams from connected hardware. Use the filters in each card to drill into a specific test or athlete."
            />
            <LiveDataSection
              data={data}
              selectedTeams={selectedTeams}
              branding={branding}
            />
          </div>
        );
      case "bookings":
        return (
          <div className="space-y-4">
            <SectionHeader
              title="Bookings"
              description="Schedule athlete sessions, manage practitioner availability, and sync with Cal.com."
            />
            <BookingCalendar />
          </div>
        );
      case "profiles":
        return (
          <div className="space-y-4">
            <SectionHeader
              title="Practitioner Profiles"
              description="Invite, review, and manage staff credentials for your organisation."
            />
            <StaffCredentialsTab />
          </div>
        );
      case "reports":
        return (
          <ComingSoonSection
            title="Custom Reports"
            description="Branded report templates and exportable PDFs tailored to your organisation."
            eta="Q3 2026"
            bullets={[
              "Generate athlete progress reports",
              "Schedule recurring email exports",
              "Custom branded PDF templates",
              "Multi-athlete cohort summaries",
            ]}
          />
        );
      case "programming":
        return (
          <ComingSoonSection
            title="Exercise Programming"
            description="Build, assign, and track exercise programs directly from your dashboard."
            eta="Q4 2026"
            tierGated
            bullets={[
              "Build reusable exercise programs",
              "Assign templates to athletes",
              "Track adherence over time",
              "Link programs to test results",
            ]}
          />
        );
      case "payment":
      case "payment-packages":
        return (
          <ComingSoonSection
            title="Payment Packages"
            description="Self-serve subscription management for your organisation. Contact support for tier changes in the meantime."
            eta="Q3 2026"
            bullets={[
              "View current subscription tier",
              "Upgrade or downgrade plan",
              "Manage billing details",
              "Download past invoices",
            ]}
          />
        );
      default:
        return (
          <>
            {/* Performance Highlights */}
            <HighlightsSection
              data={data}
              selectedTeams={selectedTeams}
              setSelectedTeams={setSelectedTeams}
              resetFiltersKey={resetFiltersKey}
              allData={data}
              branding={branding}
            />
            
            {/* Pogo & Other Tests */}
            <ReportFilters 
              key="pogo-section"
              data={filteredData} 
              onTestSelect={setSelectedTest2}
              allData={sectionData}
              resetFiltersKey={resetKey2} 
              selectedTeams={selectedTeams}
              buttonText="Pogo & Other Tests"
              branding={branding}
            />
            
            {/* Individual / Between Limb Comparisons */}
            <IndividualComparisonSection 
              data={data} 
              resetFiltersKey={resetFiltersKey}
              selectedTeams={selectedTeams}
              branding={branding}
            />
            
            {/* Comparisons Amongst Elites */}
            <EliteComparison 
              data={data} 
              resetFiltersKey={resetFiltersKey}
              selectedTeams={selectedTeams}
              branding={branding}
            />
            
            {/* RegionComparison operates independently with unfiltered data */}
            <RegionComparison 
              data={data} 
              resetFiltersKey={resetFiltersKey} 
              selectedTeams={selectedTeams}
              branding={branding}
            />
          </>
        );
    }
  };

  return (
    <div 
      className="space-y-6 w-full"
      style={branding ? {
        fontFamily: branding.font_family || 'Inter, system-ui, sans-serif'
      } : {}}
    >
      {renderContent()}
    </div>
  );
};
