export type DebouncedFunction<F extends (...args: unknown[]) => void> = F & { cancel: () => void };

export function debounce<F extends (...args: unknown[]) => void>(fn: F, delay = 500): DebouncedFunction<F> {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  const debounced = ((...args: Parameters<F>) => {
    if (timeoutId) clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      fn(...args);
    }, delay);
  }) as DebouncedFunction<F>;
  debounced.cancel = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
  };
  return debounced;
}


