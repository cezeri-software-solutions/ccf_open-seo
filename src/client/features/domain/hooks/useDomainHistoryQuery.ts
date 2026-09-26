import { useQuery } from "@tanstack/react-query";
import { getDomainHistory } from "@/serverFunctions/domain";
import type { DomainHistorySpan } from "@/types/schemas/domain";
import type { ResearchScope } from "@/shared/researchScope";

type Input = {
  projectId: string;
  domain: string;
  scope: ResearchScope;
  locationCode: number | undefined;
  months: DomainHistorySpan;
  worldwide?: boolean;
  /** False until the user opens the history panel, so the billed call waits. */
  enabled: boolean;
};

export function useDomainHistoryQuery(input: Input) {
  const trimmedDomain = input.domain.trim();

  return useQuery({
    enabled: input.enabled && trimmedDomain !== "",
    queryKey: [
      "domain-history",
      input.projectId,
      trimmedDomain,
      input.scope,
      input.worldwide ? "worldwide" : input.locationCode,
      input.months,
    ],
    queryFn: () =>
      getDomainHistory({
        data: {
          projectId: input.projectId,
          domain: trimmedDomain,
          scope: input.scope,
          locationCode: input.worldwide ? undefined : input.locationCode,
          months: input.months,
          worldwide: input.worldwide || undefined,
        },
      }),
    staleTime: 5 * 60_000,
  });
}
