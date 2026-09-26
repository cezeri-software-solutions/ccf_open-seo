import { z } from "zod";
import { isValidDomainHost, researchScopeSchema } from "@/shared/researchScope";

/**
 * Extract and validate a bare hostname from user input that may be a full URL.
 * Strips protocol, www prefix, path, query-string, and hash.
 */
export function normalizeDomain(input: string): string {
  let d = input.trim().toLowerCase();
  // Ensure URL() can parse the input by adding a protocol if missing
  if (!/^[a-z]+:\/\//.test(d)) d = `https://${d}`;
  const { hostname } = new URL(d); // throws on truly invalid input
  return hostname.replace(/^www\./, "");
}

/** Zod field: accepts a bare domain or full URL, outputs a clean hostname. */
export const domainField = z
  .string()
  .min(1)
  .max(253)
  .transform((val, ctx) => {
    try {
      const hostname = normalizeDomain(val);
      if (!hostname.includes(".") || !isValidDomainHost(hostname)) {
        ctx.addIssue({
          code: "custom",
          message: "Enter a valid domain like example.com",
        });
        return z.NEVER;
      }
      return hostname;
    } catch {
      ctx.addIssue({
        code: "custom",
        message: "Enter a valid domain like example.com",
      });
      return z.NEVER;
    }
  });

export const booleanSearchParamSchema = z
  .union([z.boolean(), z.enum(["true", "false"])])
  .transform((value) => value === true || value === "true");

export const domainOverviewSchema = z.object({
  projectId: z.string().uuid(),
  domain: z.string().min(1, "Domain is required").max(2048),
  scope: researchScopeSchema.optional(),
  locationCode: z.number().int().positive().optional(),
  languageCode: z.string().min(2).max(8).optional(),
  /** Omit the country and return organic traffic for every country. */
  worldwide: z.boolean().optional(),
});

/** One to six years. Six years reaches October 2020, the earliest month. */
export const DOMAIN_HISTORY_SPANS = [12, 24, 36, 48, 60, 72] as const;
export type DomainHistorySpan = (typeof DOMAIN_HISTORY_SPANS)[number];

export function isDomainHistorySpan(value: number): value is DomainHistorySpan {
  return DOMAIN_HISTORY_SPANS.some((span) => span === value);
}

export function domainHistoryRangeLabel(months: DomainHistorySpan): string {
  const years = months / 12;
  return years === 1 ? "1 Jahr" : `${years} Jahre`;
}

/** Raw DataForSEO price for one country: $0.12 plus $0.0012 per returned month. */
export function domainHistoryCostUsd(months: DomainHistorySpan): number {
  return Math.round((0.12 + months * 0.0012) * 10_000) / 10_000;
}

/** Worldwide history is one bulk request, independent of the window length. */
export const WORLDWIDE_HISTORY_COST_USD = 0.1212;

export function domainHistoryOptionLabel(
  months: DomainHistorySpan,
  worldwide = false,
): string {
  const cost = worldwide
    ? WORLDWIDE_HISTORY_COST_USD
    : domainHistoryCostUsd(months);
  return `${domainHistoryRangeLabel(months)} / $${cost.toFixed(4)}`;
}

export const domainHistorySchema = domainOverviewSchema.extend({
  months: z
    .union([
      z.literal(12),
      z.literal(24),
      z.literal(36),
      z.literal(48),
      z.literal(60),
      z.literal(72),
    ])
    .default(12),
});

/* ------------------------------------------------------------------ */
/*  URL search params schema for /p/$projectId/domain                  */
/* ------------------------------------------------------------------ */

const domainSortModes = ["rank", "traffic", "volume", "score", "cpc"] as const;
const domainSortOrders = ["asc", "desc"] as const;
const domainTabs = ["keywords", "pages"] as const;

export const domainKeywordSuggestionsSchema = z.object({
  projectId: z.string().uuid(),
  domain: z.string().min(1, "Domain is required").max(2048),
  scope: researchScopeSchema.optional(),
  locationCode: z.number().int().positive().optional(),
  languageCode: z.string().min(2).max(8).optional(),
});

export const DOMAIN_KEYWORDS_PAGE_SIZES = [50, 100, 200] as const;
export const DEFAULT_DOMAIN_KEYWORDS_PAGE_SIZE = 100;
export const MAX_DATAFORSEO_FILTER_CONDITIONS = 8;

const optionalNumber = z
  .union([
    z.number(),
    z.string().transform((value, ctx) => {
      const trimmed = value.trim();
      if (trimmed === "") return undefined;
      const parsed = Number(trimmed);
      if (!Number.isFinite(parsed)) {
        ctx.addIssue({ code: "custom", message: "Invalid number" });
        return z.NEVER;
      }
      return parsed;
    }),
  ])
  .optional();

const domainKeywordsFiltersSchema = z.object({
  include: z.string().optional(),
  exclude: z.string().optional(),
  minTraffic: optionalNumber,
  maxTraffic: optionalNumber,
  minVol: optionalNumber,
  maxVol: optionalNumber,
  minCpc: optionalNumber,
  maxCpc: optionalNumber,
  minKd: optionalNumber,
  maxKd: optionalNumber,
  minRank: optionalNumber,
  maxRank: optionalNumber,
});

export type DomainKeywordsFilters = z.infer<typeof domainKeywordsFiltersSchema>;

export const domainKeywordsPageRequestSchema = z.object({
  projectId: z.string().uuid(),
  domain: z.string().min(1).max(2048),
  scope: researchScopeSchema.optional(),
  locationCode: z.number().int().positive().optional(),
  languageCode: z.string().min(2).max(8).optional(),
  page: z.number().int().positive().default(1),
  pageSize: z
    .number()
    .int()
    .refine((value) =>
      (DOMAIN_KEYWORDS_PAGE_SIZES as readonly number[]).includes(value),
    )
    .default(DEFAULT_DOMAIN_KEYWORDS_PAGE_SIZE),
  sortMode: z.enum(domainSortModes).default("traffic"),
  sortOrder: z.enum(domainSortOrders).default("desc"),
  filters: domainKeywordsFiltersSchema.default({}),
  search: z.string().optional(),
});

const domainPagesSortModes = ["traffic", "keywords"] as const;

export const domainPagesPageRequestSchema = z.object({
  projectId: z.string().uuid(),
  domain: z.string().min(1).max(2048),
  scope: researchScopeSchema.optional(),
  locationCode: z.number().int().positive().optional(),
  languageCode: z.string().min(2).max(8).optional(),
  page: z.number().int().positive().default(1),
  pageSize: z
    .number()
    .int()
    .refine((value) =>
      (DOMAIN_KEYWORDS_PAGE_SIZES as readonly number[]).includes(value),
    )
    .default(DEFAULT_DOMAIN_KEYWORDS_PAGE_SIZE),
  sortMode: z.enum(domainPagesSortModes).default("traffic"),
  sortOrder: z.enum(domainSortOrders).default("desc"),
  filters: domainKeywordsFiltersSchema.default({}),
  search: z.string().optional(),
});

const optionalSearchNumberParam = z.coerce.number().optional().catch(undefined);
const optionalSearchPositiveIntParam = z.coerce
  .number()
  .int()
  .positive()
  .optional()
  .catch(undefined);
const filterStringParam = z.string().optional();
const filterNumberParam = optionalSearchNumberParam;

export const domainSearchSchema = z.object({
  domain: z.string().optional(),
  scope: researchScopeSchema.optional().catch(undefined),
  /** Legacy param: pre-scope URLs encoded "Include subdomains" here. */
  subdomains: booleanSearchParamSchema.optional(),
  sort: z.enum(domainSortModes).optional(),
  order: z.enum(domainSortOrders).optional(),
  tab: z.enum(domainTabs).optional(),
  loc: optionalSearchPositiveIntParam,
  worldwide: booleanSearchParamSchema.optional(),
  page: optionalSearchPositiveIntParam,
  size: z.coerce
    .number()
    .int()
    .refine((value) =>
      (DOMAIN_KEYWORDS_PAGE_SIZES as readonly number[]).includes(value),
    )
    .optional()
    .catch(undefined),
  include: filterStringParam,
  exclude: filterStringParam,
  minTraffic: filterNumberParam,
  maxTraffic: filterNumberParam,
  minVol: filterNumberParam,
  maxVol: filterNumberParam,
  minCpc: filterNumberParam,
  maxCpc: filterNumberParam,
  minKd: filterNumberParam,
  maxKd: filterNumberParam,
  minRank: filterNumberParam,
  maxRank: filterNumberParam,
  pInclude: filterStringParam,
  pExclude: filterStringParam,
  pMinTraffic: filterNumberParam,
  pMaxTraffic: filterNumberParam,
  pMinVol: filterNumberParam,
  pMaxVol: filterNumberParam,
});

export type DomainSearchParams = z.infer<typeof domainSearchSchema>;

/** Sentinel for the Domain Overview country picker. Not a DataForSEO location. */
export const WORLDWIDE_LOCATION_CODE = 0;
