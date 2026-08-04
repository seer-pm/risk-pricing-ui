import { useQuery } from "@tanstack/react-query";

import { RiskAssetData } from "@/consts/markets";

export const useCredoraAssets = () =>
  useQuery<Record<string, RiskAssetData>>({
    queryKey: ["credoraAssets"],
    staleTime: 5 * 60 * 1000,
    // Throw rather than resolving to {}: swallowing the failure left the Risk
    // Panel silently showing stale hardcoded data with no way to tell.
    queryFn: async () => {
      const res = await fetch("/api/credora");
      if (!res.ok) {
        throw new Error(`Credora request failed (${res.status})`);
      }
      return res.json();
    },
  });
