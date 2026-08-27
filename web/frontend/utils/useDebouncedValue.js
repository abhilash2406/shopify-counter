import { useEffect, useState } from "react";

/**
 * Delays propagating a fast-changing value (a search box) so it can drive a
 * request without firing one per keystroke.
 */
export function useDebouncedValue(value, delay = 300) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timeout = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timeout);
  }, [value, delay]);

  return debounced;
}
