import { useEffect, useRef, useState } from 'react';

export type OddChange = 'up' | 'down' | 'same';

type Result = {
  previous: number | null;
  change: OddChange;
  flash: boolean;
};

/**
 * Compara o `current` com o valor anterior e retorna:
 *  - change: 'up' (subiu), 'down' (desceu) ou 'same'
 *  - flash: true por 1.5s após a mudança, para disparar animação CSS
 *  - previous: o valor anterior (ou null no primeiro render)
 */
export function useOddChange(current: number | null, key?: string | number): Result {
  const previousRef = useRef<number | null>(current);
  const [change, setChange] = useState<OddChange>('same');
  const [flash, setFlash] = useState(false);

  useEffect(() => {
    const prev = previousRef.current;
    let next: OddChange = 'same';
    if (prev !== null && current !== null && current !== prev) {
      next = current > prev ? 'up' : 'down';
    }

    if (next !== 'same') {
      setChange(next);
      setFlash(true);
      const t = window.setTimeout(() => setFlash(false), 1500);
      previousRef.current = current;
      return () => window.clearTimeout(t);
    }

    previousRef.current = current;
    return undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current, key]);

  return { previous: previousRef.current, change, flash };
}
