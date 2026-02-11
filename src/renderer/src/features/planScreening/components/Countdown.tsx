import dayjs from "dayjs";
import { useEffect, useState } from "react";

const Countdown = ({ orderCreatedAt }: { orderCreatedAt?: string }) => {
  const [timeLeft, setTimeLeft] = useState<string>("");

  useEffect(() => {
    const interval = setInterval(() => {
      const expire = dayjs(orderCreatedAt).add(5, "minute");
      const remain = expire.diff(dayjs(), "second");

      if (remain <= 0) {
        setTimeLeft("00:00");
        clearInterval(interval);
        return;
      }

      const mm = Math.floor(remain / 60);
      const ss = remain % 60;

      setTimeLeft(`${mm}:${ss.toString().padStart(2, "0")}`);
    }, 1000);

    return () => clearInterval(interval);
  }, [orderCreatedAt]);

  if (!timeLeft) return null;

  return <span className="text-chichi">[{timeLeft}]</span>;
};

export default Countdown;
