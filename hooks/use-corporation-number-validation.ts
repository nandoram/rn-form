import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export type CorporationValidationResult = {
  valid: boolean;
  message?: string;
};

type CorporationValidationStatus = "idle" | "loading" | "valid" | "invalid";

const CORPORATION_ENDPOINT =
  "https://fe-hometask-api.qa.vault.tryvault.com/corporation-number";

export function useCorporationNumberValidation() {
  const cacheRef = useRef(new Map<string, CorporationValidationResult>());
  const abortRef = useRef<AbortController | null>(null);
  const [status, setStatus] = useState<CorporationValidationStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  const validate = useCallback(
    async (corporationNumber: string): Promise<CorporationValidationResult> => {
      if (!/^\d{9}$/.test(corporationNumber)) {
        return { valid: false };
      }

      const cached = cacheRef.current.get(corporationNumber);
      if (cached) {
        setStatus(cached.valid ? "valid" : "invalid");
        setErrorMessage(cached.valid ? null : cached.message ?? null);
        return cached;
      }

      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setStatus("loading");
      setErrorMessage(null);

      try {
        const response = await fetch(
          `${CORPORATION_ENDPOINT}/${corporationNumber}`,
          {
            method: "GET",
            signal: controller.signal,
          }
        );

        if (!response.ok) {
          const fallbackMessage = "Invalid corporation number";
          setStatus("invalid");
          setErrorMessage(fallbackMessage);
          const result = { valid: false, message: fallbackMessage };
          return result;
        }

        const payload = await response.json();
        const result: CorporationValidationResult = {
          valid: Boolean(payload?.valid),
          message: payload?.valid
            ? undefined
            : payload?.message ?? "Invalid corporation number",
        };

        cacheRef.current.set(corporationNumber, result);
        setStatus(result.valid ? "valid" : "invalid");
        setErrorMessage(result.valid ? null : result.message ?? null);
        return result;
      } catch (error) {
        if (controller.signal.aborted) {
          return { valid: false };
        }

        const fallbackMessage = "Invalid corporation number";
        setStatus("invalid");
        setErrorMessage(fallbackMessage);
        return { valid: false, message: fallbackMessage };
      }
    },
    []
  );

  const reset = useCallback(() => {
    abortRef.current?.abort();
    setStatus("idle");
    setErrorMessage(null);
  }, []);

  return useMemo(
    () => ({
      status,
      errorMessage,
      isLoading: status === "loading",
      validate,
      reset,
    }),
    [errorMessage, status, validate, reset]
  );
}
