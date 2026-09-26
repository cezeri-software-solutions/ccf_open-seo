import { waitUntil } from "cloudflare:workers";
import { z } from "zod";
import type { BillingCustomerContext } from "@/server/billing/subscription";
import { createDataforseoClient } from "@/server/lib/dataforseo";
import { buildCacheKey, getCached, setCached } from "@/server/lib/r2-cache";
import { parseResearchTargetOrThrow } from "@/server/lib/domainUtils";
import type { ResearchScope } from "@/shared/researchScope";
import {
  historyWindowStart,
  mapHistoricalRankMonths,
  type DomainHistoryMonth,
} from "@/server/features/domain/services/domainHistoryMonths";

const DOMAIN_HISTORY_TTL_SECONDS = 12 * 60 * 60;

const domainHistoryResultSchema = z.object({
  domain: z.string(),
  months: z.array(
    z.object({
      year: z.number().int(),
      month: z.number().int().min(1).max(12),
      organicTraffic: z.number().nullable(),
      organicKeywords: z.number().nullable(),
    }),
  ),
  fetchedAt: z.string(),
});

export type DomainHistoryResult = z.infer<typeof domainHistoryResultSchema> & {
  months: DomainHistoryMonth[];
};

export async function getHistory(
  input: {
    projectId: string;
    domain: string;
    scope?: ResearchScope;
    locationCode?: number;
    languageCode?: string;
    months: number;
    worldwide?: boolean;
  },
  billingCustomer: BillingCustomerContext,
): Promise<DomainHistoryResult> {
  const target = parseResearchTargetOrThrow(input.domain, input.scope);
  const domain = target.hostname;
  // dateFrom is part of the key, so 12 and 72 months do not reuse each other.
  // Worldwide is a separate series from any single country.
  const dateFrom = historyWindowStart(input.months);
  const cacheKey = await buildCacheKey("domain:history", {
    organizationId: billingCustomer.organizationId,
    projectId: input.projectId,
    domain,
    locationCode: input.worldwide ? "worldwide" : input.locationCode,
    languageCode: input.worldwide ? "" : input.languageCode,
    dateFrom,
  });

  const cachedRaw = await getCached(cacheKey);
  const cached = domainHistoryResultSchema.safeParse(cachedRaw);
  if (cached.success) {
    return cached.data;
  }

  const dataforseo = createDataforseoClient(billingCustomer);
  const months = input.worldwide
    ? mapHistoricalRankMonths(
        (
          await dataforseo.domain.historicalBulkTraffic({
            target: domain,
            dateFrom,
          })
        ).map((row) => ({
          year: row.year,
          month: row.month,
          metrics: { organic: { etv: row.etv, count: row.count } },
        })),
      )
    : mapHistoricalRankMonths(
        await dataforseo.domain.historicalRankOverview({
          target: domain,
          locationCode: input.locationCode ?? 0,
          languageCode: input.languageCode ?? "en",
          dateFrom,
        }),
      );

  const result: DomainHistoryResult = {
    domain,
    months,
    fetchedAt: new Date().toISOString(),
  };

  waitUntil(
    setCached(cacheKey, result, DOMAIN_HISTORY_TTL_SECONDS).catch((error) => {
      console.error("domain.history.cache-write failed:", error);
    }),
  );

  return result;
}
