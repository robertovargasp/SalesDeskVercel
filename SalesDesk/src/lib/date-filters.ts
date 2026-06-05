export type DateRangeFilter = 'today' | 'week' | 'month' | 'custom';

export function getDateRange(
  filter: DateRangeFilter,
  customStart?: Date,
  customEnd?: Date
): { start: Date; end: Date } {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  if (filter === 'today') {
    const end = new Date(today);
    end.setHours(23, 59, 59, 999);
    return { start: today, end };
  }

  if (filter === 'week') {
    const start = new Date(today);
    start.setDate(today.getDate() - today.getDay());
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    end.setHours(23, 59, 59, 999);
    return { start, end };
  }

  if (filter === 'month') {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    return { start, end };
  }

  // custom
  const start = customStart || today;
  const end = customEnd
    ? new Date(customEnd.getFullYear(), customEnd.getMonth(), customEnd.getDate(), 23, 59, 59, 999)
    : new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);
  return { start, end };
}

export function applyDateFilter<T extends { createdAt: string }>(
  items: T[],
  filter: DateRangeFilter,
  customStart?: Date,
  customEnd?: Date
): T[] {
  const { start, end } = getDateRange(filter, customStart, customEnd);
  return items.filter(item => {
    const d = new Date(item.createdAt);
    return d >= start && d <= end;
  });
}

export const DATE_FILTER_LABELS: Record<DateRangeFilter, string> = {
  today: 'Hoy',
  week: 'Esta semana',
  month: 'Este mes',
  custom: 'Personalizado',
};
