"use client";

import { Label } from "@/components/ui/label";
import { useState } from "react";

interface ResetPasswordCardProps {
  userId?: string;
}

const ResetPasswordCard = ({ userId }: ResetPasswordCardProps) => {
  const [username, setUsername] = useState(userId || "");

  return (
    <div className=" flex flex-col items-start gap-3 w-[475px] h-[160px]">
      <div className="h-px bg-[#EAECF0] w-[475px]" />
      <div className="py-2 px-6 h-full w-full text-[14.7px]">
        <div className="h-[26px] mb-[4.2px]">
          <Label htmlFor="userId">Email đã đăng ký</Label>
        </div>
        <input
          type="text"
          id="userId"
          name="userId"
          className="input-form px-2 h-[34.4px]! rounded-[4.2px]!"
          placeholder="Nhập email"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
        <div className="mt-5 text-sm text-blue-700 max-w">
          Hệ thống sẽ đặt lại mật khẩu tài khoản NCC của bạn. Vui lòng kiểm tra
          email để nhận mật khẩu mới.
        </div>
      </div>
    </div>
  );
};

export default ResetPasswordCard;
