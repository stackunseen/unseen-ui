import { useEffect, useState } from 'react';

/** Only time is local UI state. Expiry is also rechecked synchronously before dispatch. */
export function useDecisionExpiry(expiresAt?: string) {
  // Server and initial hydration render both keep decisions unavailable until the
  // browser checks time. A deadline crossing during hydration cannot change markup.
  const [clock, setClock] = useState<number>();
  const deadline = expiresAt ? Date.parse(expiresAt) : NaN;
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    function update() {
      const now = Date.now();
      setClock(now);
      if (Number.isFinite(deadline) && now < deadline)
        timer = setTimeout(update, Math.min(deadline - now, 2_147_483_647));
    }
    update();
    return () => clearTimeout(timer);
  }, [deadline]);
  return {
    now: clock,
    expired: !Number.isFinite(deadline) || (clock !== undefined && clock >= deadline),
  };
}
