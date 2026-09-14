"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { SupportProgram } from "@/components/ProgramCard";

async function readProgram(response: Response): Promise<SupportProgram> {
  const json = await response.json();
  if (!response.ok || !json.success || !json.data) {
    throw new Error(json.error || "공고 정보를 불러오지 못했습니다.");
  }
  return json.data;
}

export function useProgramDetail(id: string) {
  const [program, setProgram] = useState<SupportProgram | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState<string | null>(null);
  const detailsController = useRef<AbortController | null>(null);

  const loadDetails = useCallback(async (synchronize = false) => {
    detailsController.current?.abort();
    const controller = new AbortController();
    detailsController.current = controller;
    setDetailsLoading(true);
    setDetailsError(null);
    try {
      const result = await readProgram(await fetch("/api/support-programs/" + encodeURIComponent(id), {
        method: synchronize ? "POST" : "GET",
        signal: controller.signal,
      }));
      if (!controller.signal.aborted) setProgram(result);
    } catch (err) {
      if (!controller.signal.aborted) {
        setDetailsError(err instanceof Error ? err.message : "첨부 정보를 불러오지 못했습니다.");
      }
    } finally {
      if (!controller.signal.aborted) setDetailsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    const controller = new AbortController();
    setProgram(null);
    setLoading(true);
    setError(null);
    setDetailsError(null);
    setDetailsLoading(false);
    if (!id) return () => controller.abort();

    async function load() {
      try {
        const summary = await readProgram(await fetch("/api/support-programs/" + encodeURIComponent(id) + "?view=summary", {
          signal: controller.signal,
        }));
        if (controller.signal.aborted) return;
        setProgram(summary);
        setLoading(false);
        void loadDetails();
      } catch (err) {
        if (!controller.signal.aborted) {
          setError(err instanceof Error ? err.message : "공고 정보를 불러오지 못했습니다.");
          setLoading(false);
        }
      }
    }
    void load();
    return () => {
      controller.abort();
      detailsController.current?.abort();
    };
  }, [id, loadDetails]);

  return { program, loading, error, detailsLoading, detailsError, loadDetails };
}
