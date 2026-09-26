import { memo, useState } from "react";
import { ChevronDown } from "lucide-react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useDomainHistoryQuery } from "@/client/features/domain/hooks/useDomainHistoryQuery";
import { formatRounded } from "@/client/features/domain/utils";
import {
  DOMAIN_HISTORY_SPANS,
  domainHistoryOptionLabel,
  domainHistoryRangeLabel,
  isDomainHistorySpan,
  type DomainHistorySpan,
} from "@/types/schemas/domain";
import type { ResearchScope } from "@/shared/researchScope";

export type DomainHistoryMonth = {
  year: number;
  month: number;
  organicTraffic: number | null;
  organicKeywords: number | null;
};

type Props = {
  projectId: string;
  domain: string;
  scope: ResearchScope;
  locationCode: number | undefined;
  worldwide?: boolean;
  hint?: string;
};

export const DomainMonthlyTrend = memo(function DomainMonthlyTrend({
  projectId,
  domain,
  scope,
  locationCode,
  worldwide = false,
  hint,
}: Props) {
  const searchKey = `${domain}\0${scope}\0${worldwide ? "worldwide" : (locationCode ?? "")}`;
  const [span, setSpan] = useState<DomainHistorySpan>(12);
  const [session, setSession] = useState<{
    key: string;
    expanded: boolean;
    span: DomainHistorySpan;
  } | null>(null);
  const active = session?.key === searchKey ? session : null;
  const expanded = active?.expanded ?? false;
  const historyQuery = useDomainHistoryQuery({
    projectId,
    domain,
    scope,
    locationCode,
    months: span,
    worldwide,
    // Enabled only for the span that was opened. Changing the range while
    // collapsed waits for the next open. While collapsed after an open, the
    // same span stays enabled so an in-flight request can finish.
    enabled: active != null && active.span === span,
  });
  const months = historyQuery.data?.months ?? [];
  const latest = months.at(-1);
  const previous = months.at(-2);

  function toggle() {
    setSession({
      key: searchKey,
      expanded: !expanded,
      span,
    });
  }

  function onSpanChange(value: string) {
    const next = Number(value);
    if (!isDomainHistorySpan(next)) return;
    setSpan(next);
    if (expanded) {
      setSession({ key: searchKey, expanded: true, span: next });
    }
  }

  return (
    <div className="card bg-base-100 border border-base-300">
      <div className="card-body gap-4 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <button
            type="button"
            className="flex min-w-0 flex-1 items-start gap-2 text-left"
            aria-expanded={expanded}
            onClick={toggle}
          >
            <ChevronDown
              className={`mt-0.5 size-4 shrink-0 text-base-content/60 transition-transform ${expanded ? "rotate-180" : ""}`}
            />
            <span>
              <span className="block text-sm font-medium">
                {domainHistoryRangeLabel(span)}
              </span>
              <span className="block text-xs text-base-content/60">
                {worldwide
                  ? "Estimated organic traffic and keywords by month across all countries. Loads when opened."
                  : "Estimated organic traffic and keywords by month for the whole domain. Loads when opened."}
                {hint && !worldwide ? ` ${hint}.` : ""}
              </span>
            </span>
          </button>
          <select
            className="select select-bordered select-sm w-44"
            aria-label="Zeitraum"
            value={span}
            onChange={(event) => onSpanChange(event.target.value)}
          >
            {DOMAIN_HISTORY_SPANS.map((value) => (
              <option key={value} value={value}>
                {domainHistoryOptionLabel(value, worldwide)}
              </option>
            ))}
          </select>
          {expanded && latest && previous ? (
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-sm">
              <span className="text-xs text-base-content/50">
                vs prior month
              </span>
              <MonthDelta
                label="Traffic"
                current={latest.organicTraffic}
                previous={previous.organicTraffic}
              />
              <MonthDelta
                label="Keywords"
                current={latest.organicKeywords}
                previous={previous.organicKeywords}
              />
            </div>
          ) : null}
        </div>

        {!expanded ? null : historyQuery.isLoading ? (
          <div className="skeleton h-56 w-full" />
        ) : historyQuery.isError ? (
          <p className="text-sm text-base-content/70">
            Monthly history couldn&apos;t be loaded. The current snapshot above
            is still available.
          </p>
        ) : months.length === 0 ? (
          <p className="text-sm text-base-content/70">
            Not enough monthly history for this domain yet.
          </p>
        ) : (
          <>
            <TrendChart months={months} />
            <div className="overflow-x-auto">
              <table className="table table-sm">
                <thead>
                  <tr>
                    <th>Month</th>
                    <th>Organic traffic</th>
                    <th>Keywords</th>
                  </tr>
                </thead>
                <tbody>
                  {months.map((month, index) => {
                    const prior = months[index - 1];
                    return (
                      <tr key={`${month.year}-${month.month}`}>
                        <td>{formatMonth(month.year, month.month)}</td>
                        <td>
                          <MetricCell
                            value={month.organicTraffic}
                            previous={prior?.organicTraffic}
                          />
                        </td>
                        <td>
                          <MetricCell
                            value={month.organicKeywords}
                            previous={prior?.organicKeywords}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
});

function TrendChart({ months }: { months: DomainHistoryMonth[] }) {
  const data = months.map((month) => ({
    label: formatMonth(month.year, month.month),
    traffic: month.organicTraffic,
    keywords: month.organicKeywords,
  }));

  return (
    <div className="h-56 min-w-0" aria-label="Domain trend chart">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={data}
          margin={{ left: 8, right: 8, top: 8, bottom: 0 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="currentColor"
            opacity={0.12}
          />
          <XAxis dataKey="label" minTickGap={24} tick={{ fontSize: 11 }} />
          <YAxis
            yAxisId="traffic"
            width={48}
            tickFormatter={formatAxisValue}
            tick={{ fontSize: 11 }}
          />
          <YAxis
            yAxisId="keywords"
            orientation="right"
            width={48}
            tickFormatter={formatAxisValue}
            tick={{ fontSize: 11 }}
          />
          <Tooltip content={<TrendTooltip />} />
          <Legend />
          <Line
            yAxisId="traffic"
            type="monotone"
            dataKey="traffic"
            name="Organic traffic"
            stroke="#2563eb"
            strokeWidth={2}
            dot={false}
            connectNulls={false}
          />
          <Line
            yAxisId="keywords"
            type="monotone"
            dataKey="keywords"
            name="Keywords"
            stroke="#2dd4bf"
            strokeWidth={2}
            dot={false}
            connectNulls={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function TrendTooltip({ active, payload, label }: TrendTooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-base-300 bg-base-100 px-3 py-2 text-xs shadow-sm">
      <p className="mb-1 font-medium">{label}</p>
      {payload.map((entry) => {
        const value = typeof entry.value === "number" ? entry.value : null;
        return (
          <p key={String(entry.dataKey)} style={{ color: entry.color }}>
            {entry.name}: {formatRounded(value)}
          </p>
        );
      })}
    </div>
  );
}

type TrendTooltipProps = {
  active?: boolean;
  label?: string | number;
  payload?: Array<{
    dataKey?: string | number;
    name?: string;
    value?: number | string | null;
    color?: string;
  }>;
};

function MetricCell({
  value,
  previous,
}: {
  value: number | null;
  previous: number | null | undefined;
}) {
  return (
    <div className="flex items-baseline gap-2">
      <span className="tabular-nums">{formatRounded(value)}</span>
      <ChangeLabel current={value} previous={previous ?? null} />
    </div>
  );
}

function MonthDelta({
  label,
  current,
  previous,
}: {
  label: string;
  current: number | null;
  previous: number | null;
}) {
  return (
    <span className="inline-flex items-baseline gap-1">
      <span className="text-base-content/60">{label}</span>
      <ChangeLabel current={current} previous={previous} />
    </span>
  );
}

function ChangeLabel({
  current,
  previous,
}: {
  current: number | null;
  previous: number | null;
}) {
  if (current == null || previous == null || previous === 0) return null;
  const pct = Math.round(((current - previous) / previous) * 100);
  if (!Number.isFinite(pct)) return null;
  const tone =
    pct > 0 ? "text-success" : pct < 0 ? "text-error" : "text-base-content/60";
  const arrow = pct > 0 ? "▲" : pct < 0 ? "▼" : "";
  return (
    <span className={`tabular-nums ${tone}`}>
      {arrow} {Math.abs(pct)}%
    </span>
  );
}

function formatMonth(year: number, month: number) {
  return new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString(undefined, {
    month: "short",
    year: "2-digit",
    timeZone: "UTC",
  });
}

function formatAxisValue(value: number) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}K`;
  return String(Math.round(value));
}
