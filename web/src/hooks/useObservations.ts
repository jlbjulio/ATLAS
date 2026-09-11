import { useCallback } from "react";

import { toCoreDraft } from "@/lib/mappers";
import { api } from "@/services/api";
import type { CaptureFormData, QVACExtractionResult } from "@/types";

export function useObservations() {
  const confirmDraft = useCallback(
    async (formData: CaptureFormData, extraction: QVACExtractionResult) =>
      api.confirm(toCoreDraft(formData, extraction)),
    [],
  );

  return { confirmDraft };
}
