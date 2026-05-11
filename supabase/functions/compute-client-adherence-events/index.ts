// Compute Client Adherence Events
// Detects programme milestones for athletes with linked user accounts:
//   - session streaks (3, 7, 14, 30)
//   - adherence thresholds (50%, 80%, perfect-week)
//   - programme completion
// Inserts deduped notifications into platform_in_app_notifications.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const STREAK_TIERS = [3, 7, 14, 30]
const ADHERENCE_TIERS = [50, 80, 100]
const DEDUPE_DAYS = 14

interface NotifInput {
  recipient_user_id: string
  team_id: string | null
  title: string
  message: string
  severity: string
  metadata: Record<string, unknown>
}

async function broadcastToCoaches(
  supa: any,
  teamId: string | null,
  excludeUserId: string,
  payload: { title: string; message: string; metadata: Record<string, unknown> },
): Promise<void> {
  if (!teamId) return
  try {
    const { data: practitioners } = await supa
      .from('profiles')
      .select('user_id, role')
      .eq('team_id', teamId)
      .in('role', ['organisation', 'staff', 'practitioner', 'super_admin'])
    const recipients = (practitioners ?? [])
      .map((p: any) => p.user_id)
      .filter((id: string | null): id is string => !!id && id !== excludeUserId)
    if (recipients.length === 0) return
    const m = payload.metadata as any
    const key = `${m.notification_type}|${m.athlete_id ?? ''}|${m.assignment_id ?? ''}|${m.milestone ?? ''}`
    const since = new Date(Date.now() - 14 * 86400_000).toISOString()
    const { data: existing } = await supa
      .from('platform_in_app_notifications')
      .select('recipient_user_id, metadata, created_at')
      .in('recipient_user_id', recipients)
      .gte('created_at', since)
    const dup = new Set<string>()
    for (const e of existing ?? []) {
      const em = (e.metadata ?? {}) as any
      if (em.source !== 'client_event_broadcast') continue
      const k = `${em.notification_type}|${em.athlete_id ?? ''}|${em.assignment_id ?? ''}|${em.milestone ?? ''}`
      if (k === key) dup.add(e.recipient_user_id)
    }
    const rows = recipients
      .filter((r: string) => !dup.has(r))
      .map((r: string) => ({
        recipient_user_id: r,
        team_id: teamId,
        title: payload.title,
        message: payload.message,
        severity: 'info',
        metadata: payload.metadata,
      }))
    if (rows.length > 0) await supa.from('platform_in_app_notifications').insert(rows)
  } catch (e) {
    console.warn('broadcastToCoaches failed', (e as Error).message)
  }
}

const dayMs = 86400_000

const ymd = (d: Date) => d.toISOString().slice(0, 10)

const addDays = (iso: string, n: number) => {
  const d = new Date(iso + 'T00:00:00Z')
  d.setUTCDate(d.getUTCDate() + n)
  return ymd(d)
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const supa = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  )

  try {
    const body = await req.json().catch(() => ({})) as { team_id?: string; athlete_id?: string }
    const teamFilter = body.team_id ?? null
    const athleteFilter = body.athlete_id ?? null

    // 1. Linked athletes
    let athletesQ = supa
      .from('athletes')
      .select('id, name, team_id, user_id')
      .not('user_id', 'is', null)
    if (teamFilter) athletesQ = athletesQ.eq('team_id', teamFilter)
    if (athleteFilter) athletesQ = athletesQ.eq('id', athleteFilter)
    const { data: athletes, error: athErr } = await athletesQ
    if (athErr) throw athErr
    const linked = athletes ?? []
    if (linked.length === 0) {
      return new Response(JSON.stringify({ success: true, athletes_evaluated: 0, inserted: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const athleteIds = linked.map((a) => a.id)

    // 2. Active assignments (status active or completed) per athlete
    const { data: assignments, error: asnErr } = await supa
      .from('athlete_program_assignments')
      .select('id, athlete_id, team_id, template_id, start_date, status')
      .in('athlete_id', athleteIds)
    if (asnErr) throw asnErr
    const assignmentList = assignments ?? []
    if (assignmentList.length === 0) {
      return new Response(JSON.stringify({ success: true, inserted: 0, note: 'no assignments' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const assignmentIds = assignmentList.map((a) => a.id)
    const templateIds = Array.from(new Set(assignmentList.map((a) => a.template_id)))

    // 3. Programme structure: blocks -> sessions
    const { data: blocks } = await supa
      .from('programming_blocks')
      .select('id, template_id')
      .in('template_id', templateIds)
    const blocksByTemplate = new Map<string, string[]>()
    for (const b of blocks ?? []) {
      const arr = blocksByTemplate.get(b.template_id) ?? []
      arr.push(b.id)
      blocksByTemplate.set(b.template_id, arr)
    }
    const allBlockIds = (blocks ?? []).map((b) => b.id)

    const sessionsByTemplate = new Map<string, Array<{ id: string; day_offset: number }>>()
    if (allBlockIds.length > 0) {
      const { data: sess } = await supa
        .from('programming_sessions')
        .select('id, block_id, day_offset')
        .in('block_id', allBlockIds)
      for (const s of sess ?? []) {
        // map block -> template
        const tmplId = (blocks ?? []).find((b) => b.id === s.block_id)?.template_id
        if (!tmplId) continue
        const arr = sessionsByTemplate.get(tmplId) ?? []
        arr.push({ id: s.id, day_offset: s.day_offset })
        sessionsByTemplate.set(tmplId, arr)
      }
    }

    // 4. Completion logs (session-level only)
    const { data: logs } = await supa
      .from('programme_completion_logs')
      .select('assignment_id, programming_session_id, performed_on')
      .in('assignment_id', assignmentIds)
      .not('programming_session_id', 'is', null)
    const logsByAssignment = new Map<string, Array<{ session_id: string; performed_on: string }>>()
    for (const l of logs ?? []) {
      const arr = logsByAssignment.get(l.assignment_id) ?? []
      arr.push({ session_id: l.programming_session_id!, performed_on: l.performed_on })
      logsByAssignment.set(l.assignment_id, arr)
    }

    const today = ymd(new Date())
    const notifsToInsert: NotifInput[] = []
    let streakCount = 0, adhCount = 0, completionCount = 0, perfectWeekCount = 0

    for (const ath of linked) {
      const myAssignments = assignmentList.filter((a) => a.athlete_id === ath.id)
      for (const asn of myAssignments) {
        const sessions = sessionsByTemplate.get(asn.template_id) ?? []
        if (sessions.length === 0) continue
        const completed = logsByAssignment.get(asn.id) ?? []
        const completedSet = new Set(completed.map((c) => c.session_id))

        // Build date-ordered scheduled session list
        const start = asn.start_date
        if (!start) continue
        const scheduled = sessions
          .map((s) => ({ id: s.id, date: addDays(start, s.day_offset) }))
          .sort((a, b) => a.date.localeCompare(b.date))

        const past = scheduled.filter((s) => s.date <= today)
        if (past.length === 0) continue

        const completedPast = past.filter((s) => completedSet.has(s.id)).length
        const missedPast = past.length - completedPast
        const adherence = Math.round((completedPast / past.length) * 100)

        // ---- Streak: trailing consecutive completed past sessions ----
        let streak = 0
        for (let i = past.length - 1; i >= 0; i--) {
          if (completedSet.has(past[i].id)) streak++
          else break
        }
        const streakTier = [...STREAK_TIERS].reverse().find((t) => streak >= t)
        if (streakTier) {
          notifsToInsert.push({
            recipient_user_id: ath.user_id!,
            team_id: ath.team_id,
            title: `🔥 ${streakTier}-session streak`,
            message: `You've completed ${streakTier} sessions in a row. Keep the momentum going!`,
            severity: 'success',
            metadata: {
              notification_type: 'streak',
              streak_count: streakTier,
              assignment_id: asn.id,
              athlete_id: ath.id,
              priority: 'high',
            },
          })
          streakCount++
        }

        // ---- Adherence thresholds (only when at least 4 sessions due) ----
        if (past.length >= 4) {
          const tier = [...ADHERENCE_TIERS].reverse().find((t) => adherence >= t)
          if (tier && tier < 100) {
            notifsToInsert.push({
              recipient_user_id: ath.user_id!,
              team_id: ath.team_id,
              title: `✅ ${tier}% adherence reached`,
              message: `${completedPast} of ${past.length} sessions completed. Great consistency.`,
              severity: 'success',
              metadata: {
                notification_type: 'adherence',
                adherence_pct: adherence,
                tier,
                assignment_id: asn.id,
                athlete_id: ath.id,
                priority: 'medium',
              },
            })
            adhCount++
          }
        }

        // ---- Perfect week: last 7 calendar days, all scheduled sessions completed (>=2) ----
        const weekAgo = addDays(today, -7)
        const lastWeek = past.filter((s) => s.date >= weekAgo)
        if (lastWeek.length >= 2 && lastWeek.every((s) => completedSet.has(s.id))) {
          const meta = {
            notification_type: 'programme_milestone',
            milestone: 'perfect_week',
            week_sessions: lastWeek.length,
            assignment_id: asn.id,
            athlete_id: ath.id,
            athlete_name: ath.name,
            priority: 'high',
          }
          notifsToInsert.push({
            recipient_user_id: ath.user_id!,
            team_id: ath.team_id,
            title: `🏅 Perfect week completed`,
            message: `You completed every session this week (${lastWeek.length}/${lastWeek.length}).`,
            severity: 'success',
            metadata: meta,
          })
          await broadcastToCoaches(supa, ath.team_id, ath.user_id!, {
            title: `🏅 ${ath.name} completed a perfect week`,
            message: `${lastWeek.length}/${lastWeek.length} sessions hit this week.`,
            metadata: { ...meta, source: 'client_event_broadcast' },
          })
          perfectWeekCount++
        }

        // ---- Programme completed ----
        if (
          scheduled.length > 0 &&
          scheduled.every((s) => s.date <= today) &&
          scheduled.every((s) => completedSet.has(s.id))
        ) {
          const meta = {
            notification_type: 'programme_completed',
            total_sessions: scheduled.length,
            assignment_id: asn.id,
            athlete_id: ath.id,
            athlete_name: ath.name,
            priority: 'high',
          }
          notifsToInsert.push({
            recipient_user_id: ath.user_id!,
            team_id: ath.team_id,
            title: `🎉 Programme completed`,
            message: `You finished every session of your programme. Time to celebrate — and book a retest.`,
            severity: 'success',
            metadata: meta,
          })
          await broadcastToCoaches(supa, ath.team_id, ath.user_id!, {
            title: `🎉 ${ath.name} finished their programme`,
            message: `${scheduled.length} sessions completed. Consider booking a retest.`,
            metadata: { ...meta, source: 'client_event_broadcast' },
          })
          completionCount++
        }
      }
    }

    // 5. Dedupe within DEDUPE_DAYS window using a key
    const recipientIds = Array.from(new Set(notifsToInsert.map((n) => n.recipient_user_id)))
    const dedupeSince = new Date(Date.now() - DEDUPE_DAYS * dayMs).toISOString()
    const existingByUser = new Map<string, any[]>()
    if (recipientIds.length > 0) {
      const { data: existing } = await supa
        .from('platform_in_app_notifications')
        .select('recipient_user_id, metadata, created_at')
        .in('recipient_user_id', recipientIds)
        .gte('created_at', dedupeSince)
      for (const e of existing ?? []) {
        const arr = existingByUser.get(e.recipient_user_id) ?? []
        arr.push(e)
        existingByUser.set(e.recipient_user_id, arr)
      }
    }

    const dedupeKey = (m: Record<string, unknown>) => {
      const t = m.notification_type
      if (t === 'streak') return `streak|${m.assignment_id}|${m.streak_count}`
      if (t === 'adherence') return `adherence|${m.assignment_id}|${m.tier}`
      if (t === 'programme_milestone') return `pm|${m.assignment_id}|${m.milestone}`
      if (t === 'programme_completed') return `done|${m.assignment_id}`
      return `${t}|${m.assignment_id ?? ''}`
    }

    const filtered = notifsToInsert.filter((n) => {
      const ex = existingByUser.get(n.recipient_user_id) ?? []
      const k = dedupeKey(n.metadata)
      return !ex.some((e) => dedupeKey(e.metadata ?? {}) === k)
    })

    let inserted = 0
    if (filtered.length > 0) {
      const { error: insErr } = await supa
        .from('platform_in_app_notifications')
        .insert(filtered)
      if (insErr) throw insErr
      inserted = filtered.length
    }

    return new Response(
      JSON.stringify({
        success: true,
        athletes_evaluated: linked.length,
        candidates: notifsToInsert.length,
        inserted,
        skipped_duplicates: notifsToInsert.length - filtered.length,
        breakdown: {
          streak: streakCount,
          adherence: adhCount,
          perfect_week: perfectWeekCount,
          programme_completed: completionCount,
        },
        scope: { team_id: teamFilter, athlete_id: athleteFilter },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 },
    )
  } catch (error) {
    console.error('compute-client-adherence-events error', error)
    return new Response(
      JSON.stringify({ success: false, error: (error as Error).message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 },
    )
  }
})
