import { sortBy } from "remeda";

export type DomainLocaleMetrics = {
  location_code?: number | null;
  metrics?: {
    organic?: {
      etv?: number | null;
      count?: number | null;
    } | null;
  } | null;
};

export type DomainCountryTraffic = {
  locationCode: number;
  organicTraffic: number;
  organicKeywords: number;
};

function roundMetric(value: number | null | undefined): number {
  if (value == null || !Number.isFinite(value)) return 0;
  return Math.round(value);
}

/** Sum country-language rows into one row per country, busiest first. */
export function aggregateDomainCountries(
  items: DomainLocaleMetrics[],
): DomainCountryTraffic[] {
  const byCountry = new Map<number, DomainCountryTraffic>();
  for (const item of items) {
    const locationCode = item.location_code;
    if (locationCode == null || !Number.isInteger(locationCode)) continue;
    const current = byCountry.get(locationCode) ?? {
      locationCode,
      organicTraffic: 0,
      organicKeywords: 0,
    };
    current.organicTraffic += roundMetric(item.metrics?.organic?.etv);
    current.organicKeywords += roundMetric(item.metrics?.organic?.count);
    byCountry.set(locationCode, current);
  }
  return sortBy(
    [...byCountry.values()].filter(
      (country) => country.organicTraffic > 0 || country.organicKeywords > 0,
    ),
    [(country) => country.organicTraffic, "desc"],
    [(country) => country.organicKeywords, "desc"],
  );
}
