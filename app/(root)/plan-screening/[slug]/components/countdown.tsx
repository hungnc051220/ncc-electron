import { format } from "date-fns";
import { startTransition, useEffect, useState } from "react";

const Countdown = ({ orderCreatedAt }: { orderCreatedAt?: string }) => {
  const [timeLeft, setTimeLeft] = useState<number | null>(0);

  useEffect(() => {
    if (orderCreatedAt) {
      const expiresAt = new Date(orderCreatedAt).getTime() + 5 * 60 * 1000;
      const diff = Math.floor((expiresAt - Date.now()) / 1000);
      startTransition(() => {
        setTimeLeft(diff > 0 ? diff : 0);
      });
    }

    const timer = setInterval(() => {
      setTimeLeft((t) => (t !== null ? t - 1 : null));
    }, 1000);

    return () => clearInterval(timer);
  }, [orderCreatedAt]);

  if (!timeLeft) return null;

  return (
    <span className="text-chichi">
      [{format(new Date(timeLeft * 1000), "mm:ss")}]
    </span>
  );
};

export default Countdown;
