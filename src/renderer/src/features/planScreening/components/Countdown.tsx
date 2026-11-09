import dayjs from "dayjs";
import { useEffect, useState } from "react";

interface CountdownProps {
  orderCreatedAt?: string;
  expired: boolean;
  setExpired: (value: boolean) => void;
}

/** Thời gian còn lại của QR (5 phút từ lúc tạo đơn), dạng m:ss; hết giờ thì gọi `setExpired(true)` và hiện 0:00. */
const Countdown = ({ orderCreatedAt, expired, setExpired }: CountdownProps) => {
  const [timeLeft, setTimeLeft] = useState("");

  useEffect(() => {
    if (!orderCreatedAt) return;

    const expire = dayjs(orderCreatedAt).add(5, "minute");

    const update = () => {
      const remain = expire.diff(dayjs(), "second");

      if (remain <= 0) {
        setExpired(true);
        setTimeLeft("0:00");
        return false; // stop interval
      }

      const mm = Math.floor(remain / 60);
      const ss = remain % 60;

      setTimeLeft(`${mm}:${ss.toString().padStart(2, "0")}`);
      return true;
    };

    // chạy ngay lần đầu để tránh delay 1s
    if (!update()) return;

    const id = setInterval(() => {
      if (!update()) clearInterval(id);
    }, 1000);

    return () => clearInterval(id);
  }, [orderCreatedAt, setExpired]);

  if (!orderCreatedAt) return null;

  return (
    <span
      data-testid="qr-countdown"
      className={
        expired
          ? "rounded-lg px-2.5 py-1 font-mono text-lg font-bold tabular-nums text-red-600 dark:text-red-400"
          : "rounded-lg bg-white px-2.5 py-1 font-mono text-lg font-bold tabular-nums text-chichi shadow-sm dark:bg-white/10"
      }
    >
      {expired ? "0:00" : timeLeft}
    </span>
  );
};

export default Countdown;
