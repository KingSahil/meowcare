import type { CareLog, VitalsSnapshot } from '../context/CareContext';

type DashboardHeartRatePoint = {
  time: string;
  bpm: number;
};

type WeeklyHeartRatePoint = {
  date: string;
  hr: number;
};

const DASHBOARD_TIMES = ['06:00', '08:00', '10:00', '12:00', '14:00', '16:00', '18:00', '20:00'];
const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const INTRADAY_PATTERNS = [
  [-5, -3, 1, 6, 2, -2, 3, 1],
  [-6, -2, 3, 7, 1, -3, 2, 4],
  [-4, 0, 4, 5, -1, -4, 1, 3],
  [-7, -4, 0, 4, 2, -1, 5, 2]
] as const;

const WEEKLY_PATTERNS = [
  [-4, -1, 3, 6, 1, -2, 2],
  [-5, -2, 2, 5, 0, -3, 3],
  [-3, 1, 4, 2, -2, -1, 5],
  [-6, -1, 1, 4, 2, -2, 4]
] as const;

const clampHeartRate = (value: number) => Math.min(135, Math.max(56, Math.round(value)));

const extractHeartRateFromLog = (log: CareLog) => {
  if (log.type !== 'Vital Check') {
    return null;
  }

  const match = log.value.match(/(\d+(?:\.\d+)?)\s*bpm/i);
  return match ? Number(match[1]) : null;
};

const selectPatternIndex = (vitals: VitalsSnapshot, historySize: number, totalPatterns: number) =>
  Math.abs(
    Math.round(vitals.heartRate) +
      Math.round(vitals.oxygen * 10) +
      Math.round(vitals.temp) +
      historySize
  ) % totalPatterns;

const buildPatternSeries = (
  baseValue: number,
  offsets: readonly number[],
  amplitudeBoost: number
) =>
  offsets.map((offset) => clampHeartRate(baseValue + offset + amplitudeBoost));

const mergeRecentHistory = (series: number[], history: number[]) => {
  if (history.length === 0) {
    return series;
  }

  const next = [...series];
  const recentHistory = history.slice(-Math.min(history.length, next.length));

  recentHistory.forEach((value, index) => {
    const targetIndex = next.length - recentHistory.length + index;
    next[targetIndex] = clampHeartRate(value);
  });

  return next;
};

const getRecentHeartRateHistory = (logs: CareLog[], limit: number) =>
  logs
    .map(extractHeartRateFromLog)
    .filter((value): value is number => value !== null)
    .reverse()
    .slice(-limit);

export const getDashboardHeartRateTrend = (
  vitals: VitalsSnapshot,
  logs: CareLog[]
): DashboardHeartRatePoint[] => {
  const history = getRecentHeartRateHistory(logs, DASHBOARD_TIMES.length - 1);
  const patternIndex = selectPatternIndex(vitals, history.length, INTRADAY_PATTERNS.length);
  const amplitudeBoost = vitals.heartRate >= 95 ? 2 : vitals.heartRate <= 64 ? -1 : 0;

  const fallbackSeries = buildPatternSeries(
    vitals.heartRate,
    INTRADAY_PATTERNS[patternIndex],
    amplitudeBoost
  );
  const seriesWithHistory = mergeRecentHistory(fallbackSeries, [...history, vitals.heartRate]);

  return DASHBOARD_TIMES.map((time, index) => ({
    time,
    bpm: seriesWithHistory[index]
  }));
};

export const getWeeklyHeartRateTrend = (
  vitals: VitalsSnapshot,
  logs: CareLog[]
): WeeklyHeartRatePoint[] => {
  const history = getRecentHeartRateHistory(logs, WEEKDAY_LABELS.length - 1);
  const patternIndex = selectPatternIndex(vitals, history.length, WEEKLY_PATTERNS.length);
  const amplitudeBoost = vitals.heartRate >= 95 ? 1 : vitals.heartRate <= 64 ? -1 : 0;

  const fallbackSeries = buildPatternSeries(
    vitals.heartRate,
    WEEKLY_PATTERNS[patternIndex],
    amplitudeBoost
  );
  const seriesWithHistory = mergeRecentHistory(fallbackSeries, [...history, vitals.heartRate]);

  return WEEKDAY_LABELS.map((date, index) => ({
    date,
    hr: seriesWithHistory[index]
  }));
};
