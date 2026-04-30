import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Construction, Lock, Sparkles, Mail } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";

interface ComingSoonSectionProps {
  title: string;
  description: string;
  bullets?: string[];
  tierGated?: boolean;
  /** Optional ETA label, e.g. "Q3 2026" */
  eta?: string;
}

export const ComingSoonSection = ({
  title,
  description,
  bullets,
  tierGated,
  eta,
}: ComingSoonSectionProps) => {
  const [requested, setRequested] = useState(false);

  const handleRequestAccess = () => {
    setRequested(true);
    toast.success("Thanks — we'll let you know as soon as this is ready.");
  };

  const Icon = tierGated ? Lock : Sparkles;

  return (
    <div className="space-y-6 w-full animate-fade-in">
      <Card className="border-dashed border-2 bg-gradient-to-br from-background to-muted/30">
        <CardHeader className="space-y-3">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <Icon className="w-6 h-6 text-primary" />
              </div>
              <div className="min-w-0">
                <CardTitle className="flex items-center gap-2 flex-wrap">
                  <span className="truncate">{title}</span>
                  <Badge variant="secondary" className="text-[10px] uppercase tracking-wider">
                    {tierGated ? "Tier upgrade" : "Coming soon"}
                  </Badge>
                </CardTitle>
                <CardDescription className="mt-1">{description}</CardDescription>
              </div>
            </div>
            {eta && (
              <Badge variant="outline" className="text-xs shrink-0">
                ETA: {eta}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          {bullets && bullets.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                What you'll be able to do
              </h4>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {bullets.map((b) => (
                  <li
                    key={b}
                    className="flex items-start gap-2 text-sm text-foreground/80 bg-background/60 border border-border/60 rounded-md px-3 py-2"
                  >
                    <Construction className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex items-center justify-between gap-4 pt-2 border-t border-dashed flex-wrap">
            <p className="text-xs text-muted-foreground">
              We're not showing placeholder data here to keep your reports accurate.
            </p>
            <Button
              size="sm"
              variant={requested ? "secondary" : "default"}
              onClick={handleRequestAccess}
              disabled={requested}
            >
              <Mail className="w-3.5 h-3.5 mr-2" />
              {requested ? "Request received" : "Request early access"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
