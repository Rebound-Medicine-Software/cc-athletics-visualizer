import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Facebook, Instagram, Settings } from "lucide-react";

interface SocialFeedCardProps {
  viewOnly?: boolean;
}

export const SocialFeedCard = ({ viewOnly = false }: SocialFeedCardProps) => {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Facebook className="h-4 w-4 text-blue-600" />
          Social Engagement
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center justify-center text-center py-8 px-4 border-2 border-dashed border-muted rounded-lg">
          <div className="flex gap-2 mb-3">
            <div className="p-2 rounded-full bg-blue-100 dark:bg-blue-950">
              <Facebook className="h-5 w-5 text-blue-600" />
            </div>
            <div className="p-2 rounded-full bg-pink-100 dark:bg-pink-950">
              <Instagram className="h-5 w-5 text-pink-600" />
            </div>
          </div>
          <h4 className="text-sm font-semibold mb-1">Connect Meta Graph API</h4>
          <p className="text-xs text-muted-foreground mb-4 max-w-xs">
            See your latest Facebook & Instagram posts with reach, impressions, likes and comments.
          </p>
          {!viewOnly && (
            <>
              <Button variant="outline" size="sm" disabled>
                <Settings className="h-3.5 w-3.5 mr-2" />
                Setup pending
              </Button>
              <p className="text-[10px] text-muted-foreground mt-3 max-w-xs">
                Add <code className="bg-muted px-1 rounded">META_PAGE_ACCESS_TOKEN</code>, <code className="bg-muted px-1 rounded">META_PAGE_ID</code> and <code className="bg-muted px-1 rounded">META_IG_BUSINESS_ID</code> in Supabase secrets to enable.
              </p>
            </>
          )}
          {viewOnly && (
            <p className="text-[11px] text-muted-foreground mt-2 max-w-xs">
              View-only feed. Once connected, latest posts will appear here.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
