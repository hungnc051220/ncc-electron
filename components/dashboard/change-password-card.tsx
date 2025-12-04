"use client";

import { Label } from "@/components/ui/label";

interface ChangePasswordCardProps {
  fieldErrors?: Record<string, string[] | undefined> | null;
}

const ChangePasswordCard = ({ fieldErrors }: ChangePasswordCardProps) => {
  return (
    <div className="w-[475px] h-[265.8px] flex flex-col opacity-100 rotate-0">
      <div className="h-px bg-[#EAECF0]"/>
      <div className="mt-[30px] gap-[20px] px-6">
        <div className="w-[428px] h-[225.8px]">
          <div className="h-[64.6px] text-[14.7px] mb-[20px] gap-[4.2px]">
            <div className="h-[26px]">
              <Label htmlFor="old-password">Tên người dùng</Label>
            </div>
            <input
              type="username"
              name="username"
              className="input-form px-2 h-[34.4px]! rounded-[4.2px]!"
              placeholder="Nhập tên người dùng"
            />
            {fieldErrors?.oldPassword && (
              <p className="text-xs text-red-500 mt-1">
                {fieldErrors.oldPassword[0]}
              </p>
            )}
          </div>
          <div className="h-[64.6px] text-[14.7px] gap-[4.2px]">
            <div className="h-[26px]">
              <Label htmlFor="old-password">Mật khẩu cũ</Label>
            </div>
            <input
              type="password"
              id="oldPassword"
              name="oldPassword"
              className="input-form px-2 h-[34.4px]! rounded-[4.2px]!"
              placeholder="Nhập mật khẩu cũ"
            />
            {fieldErrors?.oldPassword && (
              <p className="text-xs text-red-500 mt-1">
                {fieldErrors.oldPassword[0]}
              </p>
            )}
          </div>

          <div className="h-[16.8px]" />

          <div className="flex flex-row w-full gap-[4.2px]">
            <div className="w-[206px] h-[64.6px] text-[14.7px]">
              <div className="h-[26px]">
                <Label htmlFor="new-password">Mật khẩu mới</Label>
              </div>
              <input
                type="password"
                id="newPassword"
                name="newPassword"
                className="input-form px-2 h-[34.4px]! rounded-[4.2px]!"
                placeholder="Nhập mật khẩu mới"
              />
              {fieldErrors?.newPassword && (
                <p className="text-xs text-red-500 mt-1">
                  {fieldErrors.newPassword[0]}
                </p>
              )}
            </div>

            <div className="w-[206px] ml-4 h-[64.6px] text-[14.7px]">
              <div className="h-[26px]">
                <Label htmlFor="confirm-password">Xác nhận mật khẩu</Label>
              </div>
              <input
                type="password"
                id="confirmPassword"
                name="confirmPassword"
                className="input-form px-2 h-[34.4px]! rounded-[4.2px]!"
                placeholder="Xác nhận"
              />
              {fieldErrors?.confirmPassword && (
                <p className="text-xs text-red-500 mt-1">
                  {fieldErrors.confirmPassword[0]}
                </p>
              )}
            </div>
          </div>

          <div className="h-[16.8px]" />
        </div>
      </div>
    </div>
  );
};

export default ChangePasswordCard;
