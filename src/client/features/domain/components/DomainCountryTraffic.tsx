import { CountryFlag } from "@/client/components/CountryFlag";
import { formatNumber, formatRounded } from "@/client/features/domain/utils";
import { LOCATION_OPTIONS } from "@/shared/keyword-locations";

export type CountryTrafficRow = {
  locationCode: number;
  organicTraffic: number;
  organicKeywords: number;
};

type Props = {
  countries: CountryTrafficRow[];
  onSelectCountry: (locationCode: number) => void;
};

export function DomainCountryTraffic({ countries, onSelectCountry }: Props) {
  const totalTraffic = countries.reduce(
    (sum, country) => sum + country.organicTraffic,
    0,
  );

  return (
    <div className="border border-base-300 rounded-xl bg-base-100 overflow-hidden">
      <div className="px-4 py-3 border-b border-base-300">
        <h2 className="text-sm font-medium">Traffic by country</h2>
        <p className="text-xs text-base-content/60">
          Estimated organic traffic for each country. Choose a country to see
          its keywords and pages.
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="table table-sm">
          <thead>
            <tr>
              <th>Country</th>
              <th className="text-right">Organic traffic</th>
              <th>Share</th>
              <th className="text-right">Keywords</th>
            </tr>
          </thead>
          <tbody>
            {countries.map((country) => {
              const option = LOCATION_OPTIONS.find(
                (entry) => entry.code === country.locationCode,
              );
              const share = sharePercent(country.organicTraffic, totalTraffic);
              return (
                <tr key={country.locationCode} className="hover:bg-base-200/60">
                  <td>
                    <button
                      type="button"
                      className="inline-flex items-center gap-2 font-medium hover:text-primary"
                      onClick={() => onSelectCountry(country.locationCode)}
                    >
                      <CountryFlag shortLabel={option?.shortLabel ?? ""} />
                      <span>
                        {option?.label ?? `Country ${country.locationCode}`}
                      </span>
                    </button>
                  </td>
                  <td className="text-right tabular-nums">
                    {formatRounded(country.organicTraffic)}
                  </td>
                  <td>
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-base-300">
                        <div
                          className="h-full rounded-full bg-primary"
                          style={{
                            width: `${share > 0 ? Math.max(share, 2) : 0}%`,
                          }}
                        />
                      </div>
                      <span className="tabular-nums text-base-content/70">
                        {shareLabel(share)}
                      </span>
                    </div>
                  </td>
                  <td className="text-right tabular-nums">
                    {formatNumber(country.organicKeywords)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function sharePercent(traffic: number, total: number): number {
  if (total <= 0) return 0;
  return (traffic / total) * 100;
}

function shareLabel(share: number): string {
  if (share <= 0) return "—";
  if (share < 1) return "<1%";
  return `${Math.round(share)}%`;
}
