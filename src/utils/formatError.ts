import {
  BaseError,
  ContractFunctionRevertedError,
  ExecutionRevertedError,
} from "viem";

interface Cause {
  data?: {
    message?: string;
  };
}

export const formatError = (error: Error | null): string | undefined => {
  if (!error) {
    return undefined;
  }

  if (error instanceof BaseError) {
    // prefer the actual revert reason over the generic wrapper message, so a
    // failing batch reports why it failed instead of whatever the wallet or an
    // account-less simulation happened to surface
    const revert = error.walk(
      (e) =>
        e instanceof ContractFunctionRevertedError ||
        e instanceof ExecutionRevertedError,
    );

    if (revert instanceof ContractFunctionRevertedError) {
      return revert.reason ?? revert.shortMessage;
    }

    if (revert instanceof ExecutionRevertedError) {
      return revert.details ?? revert.shortMessage;
    }

    const cause = error.cause as Cause;
    if (cause?.data?.message) {
      return cause.data.message;
    }
    return error.shortMessage;
  }

  return error.message;
};
