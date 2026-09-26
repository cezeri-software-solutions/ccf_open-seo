import { describe, expect, it } from "vitest";
import { aggregateDomainCountries } from "@/server/features/domain/services/domainWorldwide";

describe("aggregateDomainCountries", () => {
  it("sums languages in one country and sorts by traffic", () => {
    expect(
      aggregateDomainCountries([
        {
          location_code: 2040,
          metrics: { organic: { etv: 10.4, count: 2 } },
        },
        {
          location_code: 2276,
          metrics: { organic: { etv: 100.2, count: 8 } },
        },
        {
          location_code: 2040,
          metrics: { organic: { etv: 5, count: 1.6 } },
        },
        {
          location_code: 2840,
          metrics: { organic: { etv: 0, count: 0 } },
        },
      ]),
    ).toEqual([
      { locationCode: 2276, organicTraffic: 100, organicKeywords: 8 },
      { locationCode: 2040, organicTraffic: 15, organicKeywords: 4 },
    ]);
  });
});
