import { useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useMutation, useQuery } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';
import { Loader2, MessageSquarePlus, Send, User } from 'lucide-react';

// Practitioner-side compose screen for framework.md Section 4 Item 1's third
// day-one action ("message or send a resource to a specific client"). The
// athlete-facing read side (ClientDirectMessages.tsx) and the client_messages
// schema (PR #57) already shipped; this is the write side.
//
// Cross-team by design, corrected 11 September 2026 (Josh, live chat) after
// an initial version scoped this to the practitioner's own team only. Same
// established pattern as the rest of this dashboard (Section 3, Warning #5 —
// "a logged-in practitioner should see all data regardless of team") and
// matching SendReportsModal's athlete picker, which is also cross-team. The
// client_messages RLS policies were updated in the same PR as this file to
// drop the team_id = get_my_team_id() gate that PR #57 originally shipped —
// see that migration for the full explanation.
//
// Athletes are still looked up directly from the `athletes` table by id
// (not by matching name/team strings from test_data the way SendReportsModal
// does) to avoid the athlete_name-collision bug class documented extensively
// elsewhere in this repo (Section 4 Item 1's PR #34/#37/#38/#39/#40/#41/#51
// sweep) — cross-team makes name collisions more likely, not less, so this
// matters even more here. Team name is shown alongside each athlete in the
// picker so a practitioner can tell two same-named athletes on different
// teams apart before sending.

interface AthleteOption {
  id: string;
  name: string;
  team_id: string;
  team_name: string | null;
}

export const MessageClientModal = () => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedAthleteId, setSelectedAthleteId] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [resourceUrl, setResourceUrl] = useState('');

  const { data: athletes = [], isLoading } = useQuery({
    queryKey: ['message-client-athletes'],
    enabled: isOpen,
    queryFn: async (): Promise<AthleteOption[]> => {
      const { data, error } = await supabase
        .from('athletes')
        .select('id, name, team_id, teams ( name )')
        .order('name');
      if (error) throw error;
      return (data ?? []).map((a: any) => ({
        id: a.id,
        name: a.name,
        team_id: a.team_id,
        team_name: a.teams?.name ?? null,
      }));
    },
  });

  const selectedAthlete = useMemo(
    () => athletes.find((a) => a.id === selectedAthleteId) ?? null,
    [athletes, selectedAthleteId],
  );

  const reset = () => {
    setSelectedAthleteId('');
    setSubject('');
    setBody('');
    setResourceUrl('');
  };

  const send = useMutation({
    mutationFn: async () => {
      if (!selectedAthlete) throw new Error('Select a client first.');
      if (!body.trim()) throw new Error('Write a message first.');
      if (!user?.id) throw new Error('Not signed in.');

      const { error } = await (supabase as any).from('client_messages').insert({
        team_id: selectedAthlete.team_id,
        athlete_id: selectedAthlete.id,
        sender_user_id: user.id,
        subject: subject.trim() || null,
        body: body.trim(),
        resource_url: resourceUrl.trim() || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: 'Message sent',
        description: `Sent to ${selectedAthlete?.name}. They'll see it in their inbox.`,
      });
      reset();
      setIsOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: 'Could not send',
        description: error?.message ?? 'Something went wrong sending this message.',
        variant: 'destructive',
      });
    },
  });

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        setIsOpen(open);
        if (!open) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="pr-header-btn hidden md:inline-flex"
          aria-label="Message a client"
        >
          <MessageSquarePlus className="w-4 h-4 mr-2" />
          Message Client
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] w-[95vw] max-w-lg overflow-y-auto sm:w-full">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquarePlus className="h-5 w-5" />
            Message a Client
          </DialogTitle>
          <DialogDescription>
            Send a direct note or resource link to one of your clients. They'll see it in their
            "Messages from your Team" inbox.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <label className="text-sm font-medium">Client *</label>
            <Select value={selectedAthleteId} onValueChange={setSelectedAthleteId} disabled={isLoading}>
              <SelectTrigger>
                <SelectValue
                  placeholder={isLoading ? 'Loading clients...' : 'Select a client...'}
                />
              </SelectTrigger>
              <SelectContent>
                {athletes.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    <span className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      {a.name}
                      {a.team_name && (
                        <span className="text-xs text-muted-foreground">({a.team_name})</span>
                      )}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Subject</label>
            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g. Great session this week"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Message *</label>
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Write your message..."
              rows={5}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Resource link (optional)</label>
            <Input
              value={resourceUrl}
              onChange={(e) => setResourceUrl(e.target.value)}
              placeholder="https://..."
            />
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <Button
            onClick={() => send.mutate()}
            disabled={send.isPending || !selectedAthleteId || !body.trim()}
            className="flex-1"
          >
            {send.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                Send Message
              </>
            )}
          </Button>
          <Button variant="ghost" onClick={() => setIsOpen(false)} disabled={send.isPending}>
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
