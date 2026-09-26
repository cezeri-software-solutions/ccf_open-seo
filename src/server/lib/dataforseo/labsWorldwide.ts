import { z } from "zod";
import { dataforseoPost } from "@/server/lib/dataforseo/core";
import {
  assertOk,
  buildTaskBilling,
  parseTaskItems,
  type DataforseoApiResponse,
  type DataforseoItemsTask,
} from "@/server/lib/dataforseo/envelope";

const WORLDWIDE_RANK_OVERVIEW_LIMIT = 1000;

const domainLocaleMetricsItemSchema = z
  .object({
    location_code: z.number().nullable().optional(),
    language_code: z.string().nullable().optional(),
    metrics: z
      .object({
        organic: z
          .object({
            etv: z.number().nullable().optional(),
            count: z.number().nullable().optional(),
          })
          .passthrough()
          .nullable()
          .optional(),
      })
      .passthrough()
      .nullable()
      .optional(),
  })
  .passthrough();

export type DomainLocaleMetricsItem = z.infer<
  typeof domainLocaleMetricsItemSchema
>;

/**
 * One row per country-language where the domain ranks. Omitting location and
 * language is what asks DataForSEO for every locale. Limit 1000 is the
 * endpoint maximum; the default of 100 drops countries.
 */
export async function fetchDomainRankOverviewByCountry(input: {
  target: string;
}): Promise<DataforseoApiResponse<DomainLocaleMetricsItem[]>> {
  const response = await dataforseoPost<DataforseoItemsTask<unknown>>(
    "/v3/dataforseo_labs/google/domain_rank_overview/live",
    [
      {
        target: input.target,
        limit: WORLDWIDE_RANK_OVERVIEW_LIMIT,
      },
    ],
  );
  const task = assertOk(response);
  return {
    data: parseTaskItems(
      "google-domain-rank-overview-worldwide",
      task,
      domainLocaleMetricsItemSchema,
    ),
    billing: buildTaskBilling(task),
  };
}

const bulkTrafficMonthSchema = z
  .object({
    year: z.number().nullable().optional(),
    month: z.number().nullable().optional(),
    etv: z.number().nullable().optional(),
    count: z.number().nullable().optional(),
  })
  .passthrough();

export type BulkTrafficMonth = z.infer<typeof bulkTrafficMonthSchema>;

const historicalRankOverviewItemSchema = z
  .object({
    year: z.number().nullable().optional(),
    month: z.number().nullable().optional(),
    metrics: z
      .object({
        organic: z
          .object({
            etv: z.number().nullable().optional(),
            count: z.number().nullable().optional(),
          })
          .passthrough()
          .nullable()
          .optional(),
      })
      .passthrough()
      .nullable()
      .optional(),
  })
  .passthrough();

export type HistoricalRankOverviewItem = z.infer<
  typeof historicalRankOverviewItemSchema
>;

/** Monthly organic traffic and keyword counts for one country. */
export async function fetchHistoricalRankOverview(input: {
  target: string;
  locationCode: number;
  languageCode: string;
  dateFrom: string;
}): Promise<DataforseoApiResponse<HistoricalRankOverviewItem[]>> {
  const response = await dataforseoPost<DataforseoItemsTask<unknown>>(
    "/v3/dataforseo_labs/google/historical_rank_overview/live",
    [
      {
        target: input.target,
        location_code: input.locationCode,
        language_code: input.languageCode,
        date_from: input.dateFrom,
        correlate: true,
      },
    ],
  );
  const task = assertOk(response);
  return {
    data: parseTaskItems(
      "google-historical-rank-overview-live",
      task,
      historicalRankOverviewItemSchema,
    ),
    billing: buildTaskBilling(task),
  };
}

/** Monthly organic totals across every country. Location is omitted on purpose. */
export async function fetchHistoricalBulkTraffic(input: {
  target: string;
  dateFrom: string;
}): Promise<DataforseoApiResponse<BulkTrafficMonth[]>> {
  const response = await dataforseoPost<DataforseoItemsTask<unknown>>(
    "/v3/dataforseo_labs/google/historical_bulk_traffic_estimation/live",
    [
      {
        targets: [input.target],
        date_from: input.dateFrom,
        item_types: ["organic"],
      },
    ],
  );
  const task = assertOk(response);
  const items = parseTaskItems(
    "google-historical-bulk-traffic-live",
    task,
    z
      .object({
        metrics: z
          .object({
            organic: z.array(bulkTrafficMonthSchema).nullable().optional(),
          })
          .passthrough()
          .nullable()
          .optional(),
      })
      .passthrough(),
  );
  return {
    data: items[0]?.metrics?.organic ?? [],
    billing: buildTaskBilling(task),
  };
}
