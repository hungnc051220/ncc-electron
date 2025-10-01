"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "../ui/input";

const AddUser = () => {
  return (
    <div className="bg-[#F5F5F5] px-6 pt-3 pb-4">
      <p className="font-bold mb-3">Danh sách người dùng</p>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-sm mb-1">Nhóm người dùng</p>
          <Select>
            <SelectTrigger className="w-full bg-white">
              <SelectValue placeholder="Chọn nhóm người dùng" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="administrator">Administrator</SelectItem>
              <SelectItem value="customer">Customer</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm mb-1">Họ</p>
            <Input type="text" placeholder="Nhập họ" className="bg-white" />
          </div>
          <div>
            <p className="text-sm mb-1">Tên</p>
            <Input type="text" placeholder="Nhập tên" className="bg-white" />
          </div>
        </div>

        <div>
          <p className="text-sm mb-1">Hãng sản xuất</p>
          <Input
            type="text"
            placeholder="Nhập hãng sản xuất"
            className="bg-white"
          />
        </div>

        <div>
          <p className="text-sm mb-1">Địa chỉ</p>
          <Input type="text" placeholder="Nhập địa chỉ" className="bg-white" />
        </div>

        <div>
          <p className="text-sm mb-1">Email</p>
          <Input type="text" placeholder="Nhập email" className="bg-white" />
        </div>

        <div>
          <p className="text-sm mb-1">Điện thoại</p>
          <Input
            type="text"
            placeholder="Nhập số điện thoại"
            className="bg-white"
          />
        </div>

        <div>
          <p className="text-sm mb-1">Tên đăng nhập hệ thống</p>
          <Input
            type="text"
            placeholder="Nhập tên đăng nhập hệ thống"
            className="bg-white"
          />
        </div>

        <div>
          <p className="text-sm mb-1">Mật khẩu</p>
          <Input type="text" placeholder="Nhập mật khẩu" className="bg-white" />
        </div>
      </div>
    </div>
  );
};

export default AddUser;
