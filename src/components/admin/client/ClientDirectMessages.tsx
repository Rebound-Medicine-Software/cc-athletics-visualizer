import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, Paperclip, CheckCircle2 } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

// Athlete-facing "messages from your team" inbox — reads public.client_messages
// (framework.md Section 4, Item 1's third practitioner day-one action:
// "message or send a resource to a specific client"). The schema + RLS for
// this table shipped in PR #57; this is the read/mark-as-read half of the
// UI the migration's own comment flagged as still needed. The practitioner
// compose screen is a separate, not-yet-built piece — deliberately left for
// a future run per framework.md's guardrail on scoping one clear change at
// a time.
//
// No explicit .eq() recipient filter is used here: client_messages has no
// recipient_user_id column (see the migration's design notes — it resolves
// the recipient via athletes.user_id at query time instead), and the
// "Recipients can read own client messages" RLS policy already restricts
// SELECT to the caller's own messages. Filtering again client-side would
// just duplicate what the database already guarantees.

interface ClientMessage {
  id: string;
  subject: string | null;
  body: string;
  resource_url: string | null;
  created_at: string;
  read_at: string | null;
}

export const ClientDirectMessages = () => {
  const { user } = useAuth();
  const qc = useQueryClient();

  const QKEY = ['client-direct-messages', user?.id] as const;

  const { data: messages = [], isLoading } = useQuery({
    queryKey: QKEY,
    enabled: !!user?.id,
    staleTime: 30_000,
    queryFn: async (): Promise<ClientMessage[]> => {
      const { data, error } = await (supabase as any)
        .from('client_messages')
        .select('id, subject, body, resource_url, created_at, read_at')
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data ?? []) as ClientMessage[];
    },
  });

  const markRead = useMutation({
    mutationFn: async (id: string) => {
      await (supabase as any)
        .from('client_messages')
        .update({ read_at: new Date().toISOString() })
        .eq('id', id);
    },
    onMutate: async (id: string) => {
      await qc.cancelQueries({ queryKey: QKEY });
      const prev = qc.getQueryData<ClientMessage[]>(QKEY);
      qc.setQueryData<ClientMessage[]>(QKEY, (old) =>
        (old ?? []).map((m) => (m.id === id ? { ...m, read_at: new Date().toISOString() } : m)),
      );
      return { prev };
    },
    onError: (_e, _id, ctx) => ctx?.prev && qc.setQueryData(QKEY, ctx.prev),
    onSettled: () => qc.invalidateQueries({ queryKey: QKEY }),
  });

  const unread = messages.filter((m) => !m.read_at).length;

  return (
    <div className="space-y-5 animate-fade-in">
      <header className="px-1">
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.22em]">
          Direct
        </p>
        <div className="mt-1 flex items-end justify-between gap-3 flex-wrap">
          <h1 className="text-[clamp(1.85rem,7vw,2.75rem)] font-bold tracking-tight leading-[1.05] flex items-center gap-3">
            Messages from your Team
            {unread > 0 && (
              <Badge className="bg-primary text-primary-foreground animate-pop">{unread}</Badge>
            )}
          </h1>
        </div>
        <p className="text-sm text-muted-foreground mt-2">
          Notes and resources your coach or practitioner has sent you directly.
        </p>
      </header>

      {isLoading ? (
        <Skeleton className="h-40 rounded-2xl" />
      ) : messages.length === 0 ? (
        <Card className="card-premium rounded-3xl border-0">
          <CardContent className="p-10 text-center">
            <div className="mx-auto h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-3">
              <MessageSquare className="h-7 w-7 text-primary/70" />
            </div>
            <p className="text-sm font-semibold">No messages yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              Anything your coach or practitioner sends you directly will show up here.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-2">
          {messages.map((m) => (
            <Card
              key={m.id}
              onClick={() => !m.read_at && markRead.mutate(m.id)}
              className={cn(
                'card-premium rounded-2xl border-0 overflow-hidden transition-all animate-fade-in cursor-pointer',
                !m.read_at && 'shadow-[0_8px_24px_-12px_hsl(0_0%_0%/0.5)]',
                m.read_at && 'opacity-70',
              )}
            >
              <CardContent className="p-4 flex items-start gap-3">
                <div className="h-10 w-10 rounded-2xl flex items-center justify-center shrink-0 bg-primary/10 text-primary">
                  <MessageSquare className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm leading-tight">
                      {m.subject || 'Message from your team'}
                    </span>
                    {!m.read_at && (
                      <span className="h-2 w-2 rounded-full bg-primary animate-pulse" aria-label="unread" />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed whitespace-pre-wrap">
                    {m.body}
                  </p>
                  {m.resource_url && (
                    <a
                      href={m.resource_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="inline-flex items-center gap-1 text-xs text-primary mt-2 font-medium"
                    >
                      <Paperclip className="h-3 w-3" /> View resource
                    </a>
                  )}
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="text-[10px] text-muted-foreground">
                      {formatDistanceToNow(new Date(m.created_at), { addSuffix: true })}
                    </span>
                  </div>
                </div>
                {!m.read_at && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 w-8 p-0 shrink-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      markRead.mutate(m.id);
                    }}
                    disabled={markRead.isPending}
                    aria-label="Mark read"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
