import lowerBodyPower from '@/assets/sessions/lower-body-power.jpg';
import upperBodyPower from '@/assets/sessions/upper-body-power.jpg';
import rotationalPower from '@/assets/sessions/rotational-power.jpg';
import recoveryMobility from '@/assets/sessions/recovery-mobility.jpg';
import speedImg from '@/assets/sessions/speed.jpg';
import defaultImg from '@/assets/sessions/default.jpg';

export type SessionVisualKey =
  | 'lower_body_power'
  | 'upper_body_power'
  | 'rotational_power'
  | 'recovery_mobility'
  | 'speed'
  | 'default';

export interface SessionVisual {
  key: SessionVisualKey;
  image: string;
  title: string;       // "Lower Body Power"
  tag: string;         // "Male • Football • Power"
  blurb: string;       // motivational line
  focusMetric?: string;
}

export interface VisualInput {
  sport?: string | null;
  sex?: string | null;
  sessionTitle?: string | null;
  focusMetric?: string | null;
  programType?: string | null;
}

const IMAGES: Record<SessionVisualKey, string> = {
  lower_body_power: lowerBodyPower,
  upper_body_power: upperBodyPower,
  rotational_power: rotationalPower,
  recovery_mobility: recoveryMobility,
  speed: speedImg,
  default: defaultImg,
};

const ROTATIONAL_SPORTS = ['golf', 'mma', 'boxing', 'baseball', 'cricket', 'tennis', 'martial', 'fight'];
const POWER_SPORTS = ['football', 'soccer', 'rugby', 'basketball', 'hockey', 'volleyball', 'lacrosse'];
const SPEED_SPORTS = ['track', 'sprint', 'athletics', 'sevens'];

const includesAny = (s: string, arr: string[]) => arr.some((k) => s.includes(k));

const classify = ({ sport, sessionTitle, focusMetric, programType }: VisualInput): SessionVisualKey => {
  const t = `${sessionTitle ?? ''} ${focusMetric ?? ''} ${programType ?? ''}`.toLowerCase();
  const sp = (sport ?? '').toLowerCase();

  if (/recover|mobility|stretch|prehab|rehab|yoga|easy/.test(t)) return 'recovery_mobility';
  if (/rotation|rotational|throw|striking|swing|med ball|medicine ball/.test(t)) return 'rotational_power';
  if (/upper|bench|press|push|pull|row/.test(t)) return 'upper_body_power';
  if (/sprint|speed|accel|run/.test(t)) return 'speed';
  if (/lower|squat|jump|cmj|rsi|posterior|hamstring|deadlift|landing/.test(t)) return 'lower_body_power';

  // Sport defaults
  if (includesAny(sp, ROTATIONAL_SPORTS)) return 'rotational_power';
  if (includesAny(sp, SPEED_SPORTS)) return 'speed';
  if (includesAny(sp, POWER_SPORTS)) return 'lower_body_power';
  return 'default';
};

const TITLES: Record<SessionVisualKey, string> = {
  lower_body_power: 'Lower Body Power',
  upper_body_power: 'Upper Body Power',
  rotational_power: 'Rotational Power',
  recovery_mobility: 'Recovery & Mobility',
  speed: 'Speed & Acceleration',
  default: 'Performance Session',
};

const BLURBS: Record<SessionVisualKey, string> = {
  lower_body_power: 'Improve jump force, landing stiffness and acceleration transfer.',
  upper_body_power: 'Build pressing power and upper-body force expression.',
  rotational_power: 'Sharpen torque, hip-shoulder separation and striking power.',
  recovery_mobility: 'Move easy. Restore tissue quality. Sleep deep.',
  speed: 'Sharpen top-end speed, stride power and reactive strength.',
  default: 'Stay sharp. Train with intent.',
};

export const getSessionVisual = (input: VisualInput): SessionVisual => {
  const key = classify(input);
  const sex = input.sex?.trim();
  const sport = input.sport?.trim();
  const tagBits = [sex, sport, key.includes('power') ? 'Power' : key.includes('recovery') ? 'Recovery' : key.includes('speed') ? 'Speed' : 'Performance']
    .filter(Boolean)
    .join(' • ');

  return {
    key,
    image: IMAGES[key],
    title: input.sessionTitle?.trim() || TITLES[key],
    tag: tagBits || 'AI Matched',
    blurb: BLURBS[key],
    focusMetric: input.focusMetric ?? undefined,
  };
};
