import { useQuery } from "@tanstack/react-query";
import { Address } from "viem";
import { useClient } from "wagmi";

import { SupportedChain } from "@/types/market-types";

import { isUndefined } from "@/utils";
import { GetTokenResult, getTokensInfo } from "@/utils/tokensInfo";

// getTokensInfo lives in a wagmi-free module so server code can import it.
export * from "@/utils/tokensInfo";

export function useTokensInfo(
  tokens: Address[] | undefined,
  chainId: SupportedChain,
) {
  const client = useClient({ chainId });
  return useQuery<GetTokenResult[] | undefined, Error>({
    enabled: !!client && !isUndefined(tokens) && (tokens?.length ?? 0) > 0,
    queryKey: ["useTokens", tokens, chainId],
    queryFn: async () => {
      const tokensInfo = await getTokensInfo(tokens!, chainId, client!);
      return tokensInfo;
    },
  });
}
