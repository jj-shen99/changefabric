import { useState, useEffect } from "react";
import { DEBOUNCE_DELAY } from "@/lib/constants";

/**
 * Debounces a value by a specified delay.
 * Useful for search inputs to avoid excessive filtering on every keystroke.
 */
export function useDebounce<T>(value: T, delay: number = DEBOUNCE_DELAY): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}
