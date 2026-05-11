// Compute Client Rank Events
// Detects PBs, ranking changes, leader status, and retest-due signals
// for athletes with linked user accounts, then persists notifications
// into platform_in_app_notifications (deduped within a 7-day window).

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface MetricSpec {
  key: string
  label: string
  unit: string
  testName: string
  higherIsBetter: boolean
  short: string
}

const METRICS: MetricSpec[] = [
  { key: 'jump_height_ft', label: 'CMJ Jump Height', unit: 'cm', testName: 'Countermovement Jump', higherIsBetter: true, short: 'cmj_h' },
  { key: 'rsi', label: 'CMJ RSI', unit: '', testName: 'Countermovement Jump', higherIsBetter: true, short: 'cmj_rsi' },
  { key: 'force_peak', label: 'IMTP Peak Force', unit: 'N', testName: 'Isometric Mid-Thigh Pull (IMTP)', higherIsBetter: true, short: 'imtp_pf' },
  { key: 'rsi', label: 'Pogo RSI', unit: '', testName: 'Pogo Jump', higherIsBetter: true, short: 'pogo_rsi' },
]

const DEFAULT_RETEST_DAYS = 42 // 6 weeks fallback when team has no setting
const DEDUPE_DAYS = 7

const numeric = (raw: unknown): number | null => {
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw
  if (typeof raw === 'string') {
    const n = parseFloat(raw)
    return Number.isFinite(n) ? n : null
  }
  return null
}

const fmt = (n: number, unit: string) =>
  unit === 'N' ? `${Math.round(n)}${unit ? ' ' + unit : ''}` : `${n.toFixed(1)}${unit ? ' ' + unit : ''}`

interface NotifInput {
  recipient_user_id: string
  team_id: string | null
  title: string
  message: string
  severity: string
  metadata: Record<string, unknown>
}

// Broadcast a coach-side notification to every practitioner on a team.
// Deduped via metadata key over last 7 days. Excludes the triggering athlete user.
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
    const key = `${m.notification_type}|${m.athlete_id ?? ''}|${m.metric ?? m.assignment_id ?? ''}|${m.milestone ?? m.scope ?? ''}`
    const since = new Date(Date.now() - 7 * 86400_000).toISOString()
    const { data: existing } = await supa
      .from('platform_in_app_notifications')
      .select('recipient_user_id, metadata, created_at')
      .in('recipient_user_id', recipients)
      .gte('created_at', since)
    const dup = new Set<string>()
    for (const e of existing ?? []) {
      const em = (e.metadata ?? {}) as any
      if (em.source !== 'client_event_broadcast') continue
      const k = `${em.notification_type}|${em.athlete_id ?? ''}|${em.metric ?? em.assignment_id ?? ''}|${em.milestone ?? em.scope ?? ''}`
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
    if (rows.length > 0) {
      await supa.from('platform_in_app_notifications').insert(rows)
    }
  } catch (e) {
    console.warn('broadcastToCoaches failed', (e as Error).message)
  }
}

  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const supa = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  )

  try {
    const body = await req.json().catch(() => ({})) as { team_id?: string; athlete_id?: string }
    const teamFilter = body.team_id ?? null
    const athleteFilter = body.athlete_id ?? null

    // 1. Get linked athletes (must have user_id to receive notifications)
    let athletesQ = supa
      .from('athletes')
      .select('id, name, team_id, user_id')
      .not('user_id', 'is', null)
    if (teamFilter) athletesQ = athletesQ.eq('team_id', teamFilter)
    if (athleteFilter) athletesQ = athletesQ.eq('id', athleteFilter)
    const { data: athletes, error: athletesErr } = await athletesQ
    if (athletesErr) throw athletesErr
    const linked = athletes ?? []

    // 1b. Load per-team retest interval (fall back to default)
    const teamIds = Array.from(new Set(linked.map((a) => a.team_id).filter(Boolean))) as string[]
    const teamRetestDays = new Map<string, number>()
    if (teamIds.length > 0) {
      const { data: teamRows } = await supa
        .from('teams')
        .select('id, retest_interval_days')
        .in('id', teamIds)
      for (const t of teamRows ?? []) {
        const v = (t as any).retest_interval_days
        teamRetestDays.set(t.id, typeof v === 'number' && v > 0 ? v : DEFAULT_RETEST_DAYS)
      }
    }

    // 2. Pull bounded sample of recent test rows for ranking (per test_name)
    const testNames = Array.from(new Set(METRICS.map((m) => m.testName)))
    const allRowsByTest = new Map<string, any[]>()
    for (const tn of testNames) {
      const { data } = await supa
        .from('test_data')
        .select('id, athlete_name, team_name, test_region, test_date, test_name, metrics')
        .eq('test_name', tn)
        .order('test_date', { ascending: false })
        .limit(2500)
      allRowsByTest.set(tn, data ?? [])
    }

    const now = new Date()
    const dedupeSince = new Date(now.getTime() - DEDUPE_DAYS * 86400_000).toISOString()
    const notifsToInsert: NotifInput[] = []

    let pbCount = 0, rankCount = 0, leaderCount = 0, retestCount = 0

    for (const ath of linked) {
      // Get athlete's team_name + region (from any of their rows)
      const myAnyRow = (allRowsByTest.get('Countermovement Jump') ?? []).find((r) => r.athlete_name === ath.name)
        ?? Array.from(allRowsByTest.values()).flat().find((r) => r.athlete_name === ath.name)
      const teamName: string | null = myAnyRow?.team_name ?? null
      const region: string | null = myAnyRow?.test_region ?? null

      // Latest test date (any test) for retest-due
      let lastTestDate: string | null = null
      for (const rows of allRowsByTest.values()) {
        for (const r of rows) {
          if (r.athlete_name !== ath.name) continue
          if (!lastTestDate || r.test_date > lastTestDate) lastTestDate = r.test_date
        }
      }

      for (const spec of METRICS) {
        const rows = (allRowsByTest.get(spec.testName) ?? []).filter((r) => r.athlete_name === ath.name)
        if (rows.length === 0) continue

        // Group by date, average reps per date
        const byDate = new Map<string, { sum: number; n: number; ids: string[] }>()
        for (const r of rows) {
          const v = numeric((r.metrics ?? {})[spec.key])
          if (v == null) continue
          const acc = byDate.get(r.test_date) ?? { sum: 0, n: 0, ids: [] }
          acc.sum += v; acc.n += 1; acc.ids.push(r.id)
          byDate.set(r.test_date, acc)
        }
        if (byDate.size === 0) continue
        const sortedDates = Array.from(byDate.keys()).sort()
        const latestDate = sortedDates[sortedDates.length - 1]
        const latestVal = byDate.get(latestDate)!.sum / byDate.get(latestDate)!.n
        const latestSourceId = byDate.get(latestDate)!.ids[0]

        // Previous best (excluding latest date)
        let prevBest: number | null = null
        for (const d of sortedDates) {
          if (d === latestDate) continue
          const v = byDate.get(d)!.sum / byDate.get(d)!.n
          if (prevBest == null) prevBest = v
          else prevBest = spec.higherIsBetter ? Math.max(prevBest, v) : Math.min(prevBest, v)
        }

        // ===== A. Personal Best =====
        if (prevBest != null && prevBest !== 0) {
          const isPB = spec.higherIsBetter ? latestVal > prevBest : latestVal < prevBest
          const deltaPct = ((latestVal - prevBest) / Math.abs(prevBest)) * 100
          if (isPB && Math.abs(deltaPct) >= 1) {
            const meta = {
              notification_type: 'personal_best',
              metric: spec.short,
              metric_label: spec.label,
              old_value: prevBest,
              new_value: latestVal,
              score_delta: deltaPct,
              created_from_test_id: latestSourceId,
              athlete_id: ath.id,
              athlete_name: ath.name,
              priority: 'high',
            }
            notifsToInsert.push({
              recipient_user_id: ath.user_id!,
              team_id: ath.team_id,
              title: `🏆 New Personal Best — ${spec.label}`,
              message: `You improved your ${spec.label} by ${Math.abs(deltaPct).toFixed(1)}% (${fmt(latestVal, spec.unit)}).`,
              severity: 'success',
              metadata: meta,
            })
            // Coach broadcast
            await broadcastToCoaches(supa, ath.team_id, ath.user_id!, {
              title: `🏆 ${ath.name} hit a PB — ${spec.label}`,
              message: `+${Math.abs(deltaPct).toFixed(1)}% on ${spec.label} (${fmt(latestVal, spec.unit)}).`,
              metadata: { ...meta, source: 'client_event_broadcast' },
            })
            pbCount++
          }
        }

        // ===== B & C. Ranking + Leader =====
        // Compute best-per-athlete for this metric across scopes
        const allRowsForMetric = allRowsByTest.get(spec.testName) ?? []
        const computeRank = (filterFn: (r: any) => boolean) => {
          const bestByAthlete = new Map<string, number>()
          for (const r of allRowsForMetric) {
            if (!filterFn(r)) continue
            const v = numeric((r.metrics ?? {})[spec.key])
            if (v == null) continue
            const prev = bestByAthlete.get(r.athlete_name)
            if (prev == null || (spec.higherIsBetter ? v > prev : v < prev)) {
              bestByAthlete.set(r.athlete_name, v)
            }
          }
          const sorted = Array.from(bestByAthlete.entries())
            .sort((a, b) => (spec.higherIsBetter ? b[1] - a[1] : a[1] - b[1]))
          const total = sorted.length
          const idx = sorted.findIndex(([n]) => n === ath.name)
          const rank = idx >= 0 ? idx + 1 : null
          return { rank, total }
        }

        const scopes: { key: string; label: string; filter: (r: any) => boolean }[] = []
        if (teamName) scopes.push({ key: 'club', label: `your club`, filter: (r) => r.team_name === teamName })
        if (region) scopes.push({ key: 'region', label: `your region`, filter: (r) => r.test_region === region })
        scopes.push({ key: 'global', label: 'globally', filter: () => true })

        for (const sc of scopes) {
          const { rank, total } = computeRank(sc.filter)
          if (!rank || total < 2) continue

          if (rank === 1) {
            const meta = {
              notification_type: 'leader',
              metric: spec.short,
              metric_label: spec.label,
              scope: sc.key,
              new_rank: rank,
              total_athletes: total,
              athlete_id: ath.id,
              athlete_name: ath.name,
              priority: 'high',
            }
            notifsToInsert.push({
              recipient_user_id: ath.user_id!,
              team_id: ath.team_id,
              title: `👑 You lead ${sc.label} — ${spec.label}`,
              message: `#1 of ${total} for ${spec.label}. Keep that crown.`,
              severity: 'success',
              metadata: meta,
            })
            if (sc.key === 'club') {
              await broadcastToCoaches(supa, ath.team_id, ath.user_id!, {
                title: `👑 ${ath.name} leads the club — ${spec.label}`,
                message: `#1 of ${total} for ${spec.label}.`,
                metadata: { ...meta, source: 'client_event_broadcast' },
              })
            }
            leaderCount++
          } else if (rank <= Math.max(5, Math.ceil(total * 0.1))) {
            // Top 10% (or top 5) — worth notifying
            notifsToInsert.push({
              recipient_user_id: ath.user_id!,
              team_id: ath.team_id,
              title: `📈 Ranked #${rank} ${sc.label} — ${spec.label}`,
              message: `You're #${rank} of ${total} for ${spec.label}.`,
              severity: 'info',
              metadata: {
                notification_type: 'ranking',
                metric: spec.short,
                metric_label: spec.label,
                scope: sc.key,
                new_rank: rank,
                total_athletes: total,
                athlete_id: ath.id,
                priority: 'medium',
              },
            })
            rankCount++
          }
        }
      }

      // ===== E. Retest Due =====
      if (lastTestDate) {
        const retestDays = (ath.team_id && teamRetestDays.get(ath.team_id)) || DEFAULT_RETEST_DAYS
        const days = Math.floor((now.getTime() - new Date(lastTestDate).getTime()) / 86400_000)
        if (days >= retestDays) {
          notifsToInsert.push({
            recipient_user_id: ath.user_id!,
            team_id: ath.team_id,
            title: '⏳ Time to retest',
            message: `It's been ${days} days since your last test. Book a retest to see your progress.`,
            severity: 'warning',
            metadata: {
              notification_type: 'retest_due',
              days_since_last: days,
              last_test_date: lastTestDate,
              interval_days: retestDays,
              athlete_id: ath.id,
              priority: 'high',
            },
          })
          retestCount++
        }
      }
    }

    // 3. Dedupe against existing notifications in last 7 days
    const recipientIds = Array.from(new Set(notifsToInsert.map((n) => n.recipient_user_id)))
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

    const dedupKey = (m: Record<string, unknown>) =>
      `${m.notification_type}|${m.metric ?? ''}|${m.scope ?? ''}`

    const filtered = notifsToInsert.filter((n) => {
      const existing = existingByUser.get(n.recipient_user_id) ?? []
      const k = dedupKey(n.metadata)
      return !existing.some((e) => dedupKey(e.metadata ?? {}) === k)
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
          personal_best: pbCount,
          ranking: rankCount,
          leader: leaderCount,
          retest_due: retestCount,
        },
        scope: { team_id: teamFilter, athlete_id: athleteFilter },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 },
    )
  } catch (error) {
    console.error('compute-client-rank-events error', error)
    return new Response(
      JSON.stringify({ success: false, error: (error as Error).message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 },
    )
  }
})
