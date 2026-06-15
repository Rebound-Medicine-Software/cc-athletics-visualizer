import { useQuery } from '@tanstack/react-query';
import { hydrateGolfSession } from '@/lib/movement-engine/modules/golf/hydrate';

export function useGolfHydration(testDataId?: string) {
  return useQuery({
    queryKey: ['golf-hydration', testDataId],
    enabled: !!testDataId,
    queryFn: () => hydrateGolfSession(testDataId!),
    staleTime: 30_000,
  });
}
