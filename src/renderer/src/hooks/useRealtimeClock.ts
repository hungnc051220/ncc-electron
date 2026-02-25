import { useEffect, useState } from "react";

export const useRealtimeClock = (interval = 30000) => {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick((v) => v + 1), interval);
    return () => clearInterval(id);
  }, [interval]);

  return tick;
};
