import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Construction, Lock } from "lucide-react";

interface ComingSoonSectionProps {
  title: string;
  description: string;
  bullets?: string[];
  tierGated?: boolean;
}

export const ComingSoonSection = ({ title, description, bullets, tierGated }: ComingSoonSectionProps) => {
  return (
    <div className="space-y-6 w-full">
      <Card className="border-dashed">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {tierGated ? (
              <Lock className="w-5 h-5 text-primary" />
            ) : (
              <Construction className="w-5 h-5 text-primary" />
            )}
            {title}
          </CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          {bullets && bullets.length > 0 && (
            <ul className="text-sm text-muted-foreground list-disc pl-5 space-y-1">
              {bullets.map((b) => (
                <li key={b}>{b}</li>
              ))}
            </ul>
          )}
          <p className="mt-4 text-xs text-muted-foreground">
            This area is intentionally empty — no placeholder data is shown to avoid misleading reports.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
