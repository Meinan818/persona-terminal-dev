/**
 * 影时间规则：主 App 与逆影战场共用的纯时间判定。
 *
 * 默认沿用正式应用的窗口：周五/周六/周日 20:00–次日 07:00。
 * 跨夜窗口的凌晨段归属前一天，例如周一 02:00 仍属于周日晚上的影时间。
 */

export const DEFAULT_SHADOW_TIME = Object.freeze({
  days: [5, 6, 0],
  startHour: 20,
  endHour: 7,
});

const DAY_LABELS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

function clampHour(value, fallback) {
  const hour = Number(value);
  return Number.isInteger(hour) && hour >= 0 && hour <= 23 ? hour : fallback;
}

export function normalizeShadowTime(options = {}) {
  const rawDays = Array.isArray(options.days) && options.days.length ? options.days : DEFAULT_SHADOW_TIME.days;
  const days = [...new Set(rawDays.map(Number).filter(day => Number.isInteger(day) && day >= 0 && day <= 6))];
  return {
    days: days.length ? days : [...DEFAULT_SHADOW_TIME.days],
    startHour: clampHour(options.startHour, DEFAULT_SHADOW_TIME.startHour),
    endHour: clampHour(options.endHour, DEFAULT_SHADOW_TIME.endHour),
  };
}

function atDay(date, dayOffset, hour) {
  const next = new Date(date);
  next.setDate(next.getDate() + dayOffset);
  next.setHours(hour, 0, 0, 0);
  return next;
}

export function isShadowTime(date = new Date(), options = {}) {
  const { days, startHour, endHour } = normalizeShadowTime(options);
  if (startHour === endHour) return false;
  const weekday = date.getDay();
  const hour = date.getHours();
  if (startHour < endHour) {
    return days.includes(weekday) && hour >= startHour && hour < endHour;
  }
  if (hour >= startHour && days.includes(weekday)) return true;
  if (hour < endHour) {
    const yesterday = (weekday + 6) % 7;
    return days.includes(yesterday);
  }
  return false;
}

export function nextShadowTime(date = new Date(), options = {}) {
  const { days, startHour } = normalizeShadowTime(options);
  for (let offset = 0; offset <= 8; offset += 1) {
    const candidate = atDay(date, offset, startHour);
    if (!days.includes(candidate.getDay())) continue;
    if (candidate.getTime() > date.getTime()) return candidate;
  }
  return null;
}

export function shadowTimeStatus(date = new Date(), options = {}) {
  const normalized = normalizeShadowTime(options);
  const { days, startHour, endHour } = normalized;
  const active = isShadowTime(date, normalized);
  let start = null;
  let end = null;
  if (active) {
    if (startHour < endHour) {
      start = atDay(date, 0, startHour);
      end = atDay(date, 0, endHour);
    } else if (date.getHours() >= startHour) {
      start = atDay(date, 0, startHour);
      end = atDay(date, 1, endHour);
    } else {
      start = atDay(date, -1, startHour);
      end = atDay(date, 0, endHour);
    }
  }
  return {
    active,
    start,
    end,
    nextStart: nextShadowTime(date, normalized),
    ...normalized,
  };
}

export function formatShadowTimeRange(options = {}) {
  const { days, startHour, endHour } = normalizeShadowTime(options);
  const labels = [...days]
    .sort((a, b) => ((a === 0 ? 7 : a) - (b === 0 ? 7 : b)))
    .map(day => DAY_LABELS[day])
    .join('、');
  const clock = hour => `${String(hour).padStart(2, '0')}:00`;
  return `${labels} ${clock(startHour)}–${clock(endHour)}`;
}

export function formatCountdown(milliseconds) {
  if (!Number.isFinite(milliseconds)) return '—';
  if (milliseconds <= 0) return '现在';
  if (milliseconds < 60000) return '不到 1 分钟';
  const totalMinutes = Math.ceil(milliseconds / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours <= 0) return `${minutes} 分钟`;
  return minutes ? `${hours} 小时 ${minutes} 分钟` : `${hours} 小时`;
}
