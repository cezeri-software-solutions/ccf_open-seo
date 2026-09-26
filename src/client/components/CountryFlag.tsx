import { countryFlagEmoji } from "@/shared/keyword-locations";

export function CountryFlag({
  shortLabel,
  className = "",
}: {
  shortLabel: string;
  className?: string;
}) {
  const flag = countryFlagEmoji(shortLabel);
  if (!flag) return null;
  return (
    <span
      className={`shrink-0 text-base leading-none ${className}`}
      aria-hidden
    >
      {flag}
    </span>
  );
}
