import dayjs from "dayjs";
import { useEffect, useState } from "react";

interface CountdownProps {
  orderCreatedAt?: string;
  expired: boolean;
  setExpired: (value: boolean) => void;
}

const Countdown = ({ orderCreatedAt, expired, setExpired }: CountdownProps) => {
  const [timeLeft, setTimeLeft] = useState("");

  useEffect(() => {
    if (!orderCreatedAt) return;

    const expire = dayjs(orderCreatedAt).add(5, "minute");

    const update = () => {
      const remain = expire.diff(dayjs(), "second");

      if (remain <= 0) {
        setExpired(true);
        setTimeLeft("00:00");
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

  return expired ? (
    <p className="text-chichi font-bold">Đã hết thời gian thanh toán</p>
  ) : (
    <div className="font-bold text-sm">
      <p>
        Bạn còn <span className="text-chichi">[{timeLeft}]</span> thời gian thanh toán
      </p>
      <p className="mt-1 text-trunks text-sm">Đang chờ thanh toán ...</p>
    </div>
  );
};

export default Countdown;
