import { sortBy } from "remeda";

/** DataForSEO historical rank data starts on this day. */
const EARLIEST_HISTORY_DATE = "2020-10-01";

export type HistoricalRankMonthInput = {
  year?: number | null;
  month?: number | null;
  metrics?: {
    organic?: {
      etv?: number | null;
      count?: number | null;
    } | null;
  } | null;
};

export type DomainHistoryMonth = {
  year: number;
  month: number;
  organicTraffic: number | null;
  organicKeywords: number | null;
};

/** First day of the earliest month in the window, as `yyyy-mm-dd`. */
export function historyWindowStart(months: number, now = new Date()): string {
  const start = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (months - 1), 1),
  );
  const month = String(start.getUTCMonth() + 1).padStart(2, "0");
  const date = `${start.getUTCFullYear()}-${month}-01`;
  return date < EARLIEST_HISTORY_DATE ? EARLIEST_HISTORY_DATE : date;
}

function roundMetric(value: number | null | undefined): number | null {
  if (value == null || !Number.isFinite(value)) return null;
  return Math.round(value);
}

/** Newest duplicate year/month wins. Months outside 1–12 are dropped. */
export function mapHistoricalRankMonths(
  items: HistoricalRankMonthInput[],
): DomainHistoryMonth[] {
  const byKey = new Map<string, DomainHistoryMonth>();
  for (const item of items) {
    const year = item.year;
    const month = item.month;
    if (
      year == null ||
      month == null ||
      !Number.isInteger(year) ||
      !Number.isInteger(month) ||
      month < 1 ||
      month > 12
    ) {
      continue;
    }
    byKey.set(`${year}-${month}`, {
      year,
      month,
      organicTraffic: roundMetric(item.metrics?.organic?.etv),
      organicKeywords: roundMetric(item.metrics?.organic?.count),
    });
  }
  return sortBy(
    [...byKey.values()],
    (item) => item.year,
    (item) => item.month,
  );
}
