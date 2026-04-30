import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Activity,
  BarChart3,
  Calendar,
  CheckCircle2,
  ChevronDown,
  FileBarChart,
  LineChart,
  Lock,
  Menu,
  PlayCircle,
  Shield,
  Sparkles,
  Users,
  X,
  Zap,
} from "lucide-react";
import { BrandIntro, hasSeenIntro, markIntroSeen } from "@/components/landing/BrandIntro";

/** Public marketing landing. Replaces the previous auto-redirect Index. */
const Landing = () => {
  const navigate = useNavigate();
  const [showIntro, setShowIntro] = useState(false);
  const [introChecked, setIntroChecked] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  useEffect(() => {
    if (!hasSeenIntro()) {
      setShowIntro(true);
    }
    setIntroChecked(true);
  }, []);

  const handleIntroComplete = () => {
    markIntroSeen();
    setShowIntro(false);
  };

  if (!introChecked) return null;
  if (showIntro) return <BrandIntro onComplete={handleIntroComplete} />;

  const features = [
    {
      icon: Activity,
      title: "Live Force Plate Data",
      desc: "Stream Hawkin, VALD, and other force-plate hardware in real time. Auto-normalised, instantly comparable.",
    },
    {
      icon: BarChart3,
      title: "Elite Benchmarking",
      desc: "Compare every athlete against curated elite cohorts by sport, age, and weight — with gold-band visualisations.",
    },
    {
      icon: Users,
      title: "Practitioner Workflow",
      desc: "Roles, credentials, and impersonation built for clinics. Multi-team support without the admin overhead.",
    },
    {
      icon: FileBarChart,
      title: "Reports & AI Coach",
      desc: "Branded multi-page PDF reports with symmetry, history, and AI-generated coaching cues.",
    },
    {
      icon: Calendar,
      title: "Bookings & Consent",
      desc: "Cal.com-powered scheduling with athlete consent capture, audit trails, and email confirmations.",
    },
    {
      icon: LineChart,
      title: "Region & Cohort Insights",
      desc: "Drill from country down to address. Spot trends across regions, teams, and time windows.",
    },
  ];

  const trust = [
    { icon: Shield, label: "GDPR-ready workflows", desc: "Lawful basis tracking, data export, and right-to-erasure tooling." },
    { icon: CheckCircle2, label: "Athlete consent", desc: "Capture & store consent before any data is processed." },
    { icon: FileBarChart, label: "Audit logs", desc: "Every login, impersonation, and write action is recorded." },
    { icon: Lock, label: "Role-based access", desc: "Row-level security with explicit role tables — no privilege creep." },
  ];

  const tiers = [
    {
      name: "Starter",
      tagline: "Solo practitioners",
      price: "Free trial",
      features: ["Up to 10 athletes", "Live data view", "Basic reports", "Email support"],
      cta: "Start free trial",
      highlight: false,
    },
    {
      name: "Clinic",
      tagline: "Most popular",
      price: "Contact sales",
      features: ["Unlimited athletes", "Elite benchmarking", "Branded PDF reports", "Cal.com bookings", "Priority support"],
      cta: "Talk to sales",
      highlight: true,
    },
    {
      name: "Enterprise",
      tagline: "Federations & academies",
      price: "Custom",
      features: ["Multi-team org structure", "Region comparisons", "AI coach add-on", "SSO / dedicated infra", "Onboarding & SLAs"],
      cta: "Request demo",
      highlight: false,
    },
  ];

  const faqs = [
    {
      q: "Which force plate hardware do you support?",
      a: "We ingest data from Hawkin Dynamics, VALD ForceDecks, and any provider exporting CSV or JSON. New integrations land roughly every quarter.",
    },
    {
      q: "Is my athlete data private and compliant?",
      a: "Yes. All data is stored with row-level security in EU regions, every consent is timestamped, and audit logs cover all access — including super-admin impersonation.",
    },
    {
      q: "Can I brand reports and dashboards for my clinic?",
      a: "Organisations can upload a logo, set primary colours, and override fonts. Branding flows through dashboards, exports, and athlete-facing pages.",
    },
    {
      q: "Do I need to migrate off my current scheduling tool?",
      a: "No. Bookings integrate directly with Cal.com so existing event types and availability keep working. We handle the consent and audit overlay.",
    },
    {
      q: "How quickly can a new organisation get started?",
      a: "Most teams are live within a day. Sign up, invite practitioners, upload your first dataset, and the dashboards populate automatically.",
    },
  ];

  const goAuth = () => navigate("/auth");

  return (
    <div className="min-h-screen bg-[#0f1f3d] text-white overflow-x-hidden" style={{ fontFamily: "Circular, Inter, sans-serif" }}>
      {/* ─── Top nav ────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 backdrop-blur-md bg-[#0f1f3d]/80 border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 font-bold tracking-wider">
            <span className="w-8 h-8 rounded-md bg-[hsl(38,92%,50%)] flex items-center justify-center text-[#0f1f3d]">
              <Activity className="w-4 h-4" />
            </span>
            NEXUSHUB
          </Link>

          <nav className="hidden md:flex items-center gap-7 text-sm text-white/80">
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#trust" className="hover:text-white transition-colors">Security</a>
            <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
            <a href="#faq" className="hover:text-white transition-colors">FAQ</a>
          </nav>

          <div className="hidden md:flex items-center gap-2">
            <Button variant="ghost" className="text-white hover:bg-white/10" onClick={goAuth}>
              Sign in
            </Button>
            <Button
              className="bg-[hsl(38,92%,50%)] text-[#0f1f3d] hover:bg-[hsl(38,92%,55%)] font-semibold"
              onClick={goAuth}
            >
              Start free trial
            </Button>
          </div>

          <button
            className="md:hidden text-white p-2"
            onClick={() => setMobileNav(v => !v)}
            aria-label="Toggle menu"
          >
            {mobileNav ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {mobileNav && (
          <div className="md:hidden border-t border-white/10 bg-[#0f1f3d]">
            <div className="px-4 py-4 flex flex-col gap-3 text-sm">
              <a href="#features" onClick={() => setMobileNav(false)} className="py-2">Features</a>
              <a href="#trust" onClick={() => setMobileNav(false)} className="py-2">Security</a>
              <a href="#pricing" onClick={() => setMobileNav(false)} className="py-2">Pricing</a>
              <a href="#faq" onClick={() => setMobileNav(false)} className="py-2">FAQ</a>
              <Button variant="outline" className="border-white/30 text-white bg-transparent hover:bg-white/10" onClick={goAuth}>
                Sign in
              </Button>
              <Button
                className="bg-[hsl(38,92%,50%)] text-[#0f1f3d] hover:bg-[hsl(38,92%,55%)] font-semibold"
                onClick={goAuth}
              >
                Start free trial
              </Button>
            </div>
          </div>
        )}
      </header>

      {/* ─── Hero ──────────────────────────────────────────────────────── */}
      <section className="relative">
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10 opacity-40"
          style={{
            background:
              "radial-gradient(60% 50% at 50% 0%, hsl(38,92%,50%,0.18) 0%, transparent 60%), radial-gradient(50% 40% at 80% 30%, rgba(80,140,255,0.18) 0%, transparent 60%)",
          }}
        />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 sm:pt-24 pb-20 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/15 bg-white/5 text-xs uppercase tracking-[0.2em] text-white/70 mb-6">
            <Sparkles className="w-3 h-3 text-[hsl(38,92%,50%)]" />
            One hub. All data. Made simple.
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-[1.05] tracking-tight max-w-4xl mx-auto">
            Force-plate analytics, athlete management, and elite benchmarking
            <span className="text-[hsl(38,92%,50%)]"> in one place.</span>
          </h1>
          <p className="mt-6 text-base sm:text-lg text-white/70 max-w-2xl mx-auto">
            NEXUSHUB unifies your hardware streams, athlete consent, bookings, and branded reporting —
            built for performance clinics, federations, and elite academies.
          </p>

          <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
            <Button
              size="lg"
              className="bg-[hsl(38,92%,50%)] text-[#0f1f3d] hover:bg-[hsl(38,92%,55%)] font-semibold h-12 px-7"
              onClick={goAuth}
            >
              Start free trial
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-white/30 bg-white/5 text-white hover:bg-white/10 h-12 px-7"
              onClick={() => document.getElementById("features")?.scrollIntoView({ behavior: "smooth" })}
            >
              <PlayCircle className="w-4 h-4 mr-2" />
              See features
            </Button>
          </div>

          <div className="mt-10 text-xs text-white/50 uppercase tracking-[0.2em]">
            Trusted hardware partners · placeholder logos pending
          </div>
        </div>
      </section>

      {/* ─── Features ─────────────────────────────────────────────────── */}
      <section id="features" className="py-20 border-t border-white/10 bg-[#0d1a35]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <div className="text-xs uppercase tracking-[0.25em] text-[hsl(38,92%,50%)] mb-3">What you get</div>
            <h2 className="text-3xl sm:text-4xl font-bold">Everything an elite performance team needs</h2>
            <p className="mt-4 text-white/70">
              Stop stitching together spreadsheets, scheduling tools, and PDF generators. NEXUSHUB is purpose-built for
              practitioners who measure outcomes.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((f) => (
              <Card key={f.title} className="bg-white/[0.04] border-white/10 hover:bg-white/[0.07] transition-colors">
                <CardContent className="p-6">
                  <div className="w-10 h-10 rounded-lg bg-[hsl(38,92%,50%)]/15 text-[hsl(38,92%,55%)] flex items-center justify-center mb-4">
                    <f.icon className="w-5 h-5" />
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">{f.title}</h3>
                  <p className="text-sm text-white/65 leading-relaxed">{f.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Trust / Security ─────────────────────────────────────────── */}
      <section id="trust" className="py-20 border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <div className="text-xs uppercase tracking-[0.25em] text-[hsl(38,92%,50%)] mb-3">Privacy & compliance</div>
            <h2 className="text-3xl sm:text-4xl font-bold">Built for medical-grade data from day one</h2>
            <p className="mt-4 text-white/70">
              Athlete data is sensitive. We treat it that way — with explicit consent capture, role-scoped access,
              and full audit logs across every action, including super-admin impersonation.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            {trust.map((t) => (
              <div key={t.label} className="rounded-lg border border-white/10 bg-white/[0.03] p-5">
                <t.icon className="w-5 h-5 text-[hsl(38,92%,55%)] mb-3" />
                <div className="font-semibold text-white">{t.label}</div>
                <p className="text-sm text-white/60 mt-1">{t.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Pricing ──────────────────────────────────────────────────── */}
      <section id="pricing" className="py-20 border-t border-white/10 bg-[#0d1a35]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <div className="text-xs uppercase tracking-[0.25em] text-[hsl(38,92%,50%)] mb-3">Pricing preview</div>
            <h2 className="text-3xl sm:text-4xl font-bold">Plans that scale with your roster</h2>
            <p className="mt-4 text-white/70">
              Final pricing is in beta. Contact us to lock in early-adopter rates while self-serve billing rolls out.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 max-w-5xl mx-auto">
            {tiers.map((t) => (
              <div
                key={t.name}
                className={`rounded-xl border p-6 flex flex-col ${
                  t.highlight
                    ? "border-[hsl(38,92%,50%)] bg-[hsl(38,92%,50%)]/[0.06] shadow-[0_0_0_1px_hsl(38,92%,50%,0.4)]"
                    : "border-white/10 bg-white/[0.03]"
                }`}
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold">{t.name}</h3>
                  {t.highlight && (
                    <span className="text-[10px] uppercase tracking-[0.2em] bg-[hsl(38,92%,50%)] text-[#0f1f3d] px-2 py-0.5 rounded-full font-bold">
                      Popular
                    </span>
                  )}
                </div>
                <p className="text-xs text-white/60 mt-1">{t.tagline}</p>
                <div className="mt-4 text-2xl font-bold">{t.price}</div>
                <ul className="mt-5 space-y-2 text-sm text-white/75 flex-1">
                  {t.features.map((feat) => (
                    <li key={feat} className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-[hsl(38,92%,55%)] mt-0.5 shrink-0" />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  className={`mt-6 w-full ${
                    t.highlight
                      ? "bg-[hsl(38,92%,50%)] text-[#0f1f3d] hover:bg-[hsl(38,92%,55%)]"
                      : "bg-white/10 text-white hover:bg-white/20"
                  } font-semibold`}
                  onClick={goAuth}
                >
                  {t.cta}
                </Button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── FAQ ──────────────────────────────────────────────────────── */}
      <section id="faq" className="py-20 border-t border-white/10">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <div className="text-xs uppercase tracking-[0.25em] text-[hsl(38,92%,50%)] mb-3">FAQ</div>
            <h2 className="text-3xl sm:text-4xl font-bold">Common questions</h2>
          </div>

          <div className="space-y-3">
            {faqs.map((f, i) => {
              const open = openFaq === i;
              return (
                <div key={f.q} className="rounded-lg border border-white/10 bg-white/[0.03] overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setOpenFaq(open ? null : i)}
                    className="w-full flex items-center justify-between text-left px-5 py-4 hover:bg-white/[0.04] transition-colors"
                    aria-expanded={open}
                  >
                    <span className="font-medium">{f.q}</span>
                    <ChevronDown className={`w-4 h-4 text-white/60 transition-transform ${open ? "rotate-180" : ""}`} />
                  </button>
                  {open && (
                    <div className="px-5 pb-5 text-sm text-white/70 leading-relaxed">{f.a}</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ─── Final CTA ────────────────────────────────────────────────── */}
      <section className="py-20 border-t border-white/10 bg-[#0d1a35]">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <Zap className="w-8 h-8 text-[hsl(38,92%,50%)] mx-auto mb-4" />
          <h2 className="text-3xl sm:text-4xl font-bold">Ready to give your team a real performance hub?</h2>
          <p className="mt-4 text-white/70">
            Set up takes minutes. Bring your hardware, your athletes, and your existing booking flow.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Button
              size="lg"
              className="bg-[hsl(38,92%,50%)] text-[#0f1f3d] hover:bg-[hsl(38,92%,55%)] font-semibold h-12 px-7"
              onClick={goAuth}
            >
              Start free trial
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-white/30 bg-white/5 text-white hover:bg-white/10 h-12 px-7"
              onClick={goAuth}
            >
              Request demo
            </Button>
          </div>
        </div>
      </section>

      {/* ─── Footer ──────────────────────────────────────────────────── */}
      <footer className="border-t border-white/10 py-10 text-sm text-white/55">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded bg-[hsl(38,92%,50%)] flex items-center justify-center text-[#0f1f3d]">
              <Activity className="w-3 h-3" />
            </span>
            <span className="font-semibold tracking-wider text-white/80">NEXUSHUB</span>
            <span className="text-white/40">© {new Date().getFullYear()}</span>
          </div>
          <div className="flex items-center gap-5">
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#trust" className="hover:text-white transition-colors">Security</a>
            <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
            <Link to="/auth" className="hover:text-white transition-colors">Sign in</Link>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
