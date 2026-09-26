import { describe, expect, it } from "vitest";
import {
  historyWindowStart,
  mapHistoricalRankMonths,
} from "@/server/features/domain/services/domainHistoryMonths";

describe("historyWindowStart", () => {
  it("starts at the first month of the requested window", () => {
    const now = new Date("2026-09-26T22:00:00Z");
    expect(historyWindowStart(12, now)).toBe("2025-10-01");
    expect(historyWindowStart(24, now)).toBe("2024-10-01");
    expect(historyWindowStart(48, now)).toBe("2022-10-01");
    expect(historyWindowStart(72, now)).toBe("2020-10-01");
    expect(historyWindowStart(12, new Date("2026-01-01T00:00:00Z"))).toBe(
      "2025-02-01",
    );
  });

  it("does not request months before historical data exists", () => {
    expect(historyWindowStart(120, new Date("2026-09-26T22:00:00Z"))).toBe(
      "2020-10-01",
    );
  });
});

describe("mapHistoricalRankMonths", () => {
  it("rounds metrics, drops invalid months, and keeps the latest duplicate", () => {
    expect(
      mapHistoricalRankMonths([
        {
          year: 2026,
          month: 3,
          metrics: { organic: { etv: 10.4, count: 2.2 } },
        },
        { year: 2026, month: 0, metrics: { organic: { etv: 1, count: 1 } } },
        {
          year: 2026,
          month: 2,
          metrics: { organic: { etv: 4, count: null } },
        },
        {
          year: 2026,
          month: 3,
          metrics: { organic: { etv: 20.6, count: 8 } },
        },
      ]),
    ).toEqual([
      {
        year: 2026,
        month: 2,
        organicTraffic: 4,
        organicKeywords: null,
      },
      {
        year: 2026,
        month: 3,
        organicTraffic: 21,
        organicKeywords: 8,
      },
    ]);
  });
});
