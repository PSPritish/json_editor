"use client";

import { useEffect, useRef, useState } from "react";
import * as Comlink from "comlink";

export function useWorker<T>(
  workerFactory: () => Worker
): { api: Comlink.Remote<T> | null; error: string | null } {
  const [api, setApi] = useState<Comlink.Remote<T> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const workerRef = useRef<Worker | null>(null);
  
  // Keep the latest factory without triggering re-renders
  const factoryRef = useRef(workerFactory);
  useEffect(() => {
    factoryRef.current = workerFactory;
  }, [workerFactory]);

  useEffect(() => {
    try {
      if (!workerRef.current) {
        const worker = factoryRef.current();
        workerRef.current = worker;
        const proxy = Comlink.wrap<T>(worker);
        setApi(() => proxy);
      }
    } catch (err) {
      console.error("Failed to initialize worker:", err);
      setError(err instanceof Error ? err.message : "Worker creation failed");
    }

    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
        workerRef.current = null;
      }
      setApi(() => null);
    };
  }, []); // Run only once on mount

  return { api, error };
}
