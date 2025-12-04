"use client";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { CustomerRoleMenuProps, CustomerRoleProps } from "@/types";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Users } from "lucide-react";
import { useEffect, useState } from "react";

interface UserRolesClientProps {
  customerRoles: CustomerRoleProps[];
}

const UserRolesClient = ({ customerRoles }: UserRolesClientProps) => {
  const [selectedRole, setSelectedRole] = useState<number | null>(null);
  const [bodyData, setBodyData] = useState<CustomerRoleMenuProps[] | undefined>(
    undefined
  );

  const { data, isLoading, error } = useQuery({
    queryKey: ["role-menu", selectedRole],
    queryFn: async () => {
      const res = await fetch("/api/role-menu", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ roleIds: [selectedRole] }),
      });

      const json = await res.json();

      if (!res.ok) {
        const message = json?.error || "Lấy menu theo role thất bại";
        throw new Error(message);
      }
  
      return json;
    },
    enabled: !!selectedRole,
  });

  useEffect(() => {
    setBodyData(data);
  }, [data]);

  return (
    <div className="space-y-8 mt-4 xl:mt-10">
      <div className="flex items-center justify-between">
        <div>
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink href="/">Trang chủ</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Hệ thống</BreadcrumbPage>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Phân quyền nhóm người dùng</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          <h3 className="font-bold text-2xl mt-1">
            Phân quyền nhóm người dùng
          </h3>
        </div>
      </div>

      <div className="flex gap-8">
        <div className="bg-goku p-4 w-[296px] rounded-md">
          <p className="font-bold mb-2">Nhóm người dùng</p>

          <div className="space-y-1">
            {customerRoles.map((role) => (
              <div
                key={role.id}
                className={cn(
                  "flex items-center gap-2 p-2 text-sm cursor-pointer rounded-md",
                  selectedRole === role.id && "bg-trunks text-white"
                )}
                onClick={() => setSelectedRole(role.id)}
              >
                <Users className="size-4" />
                {role.name}
              </div>
            ))}
          </div>
        </div>
        <div className="flex-1">
          {!selectedRole ? (
            <div className="flex items-center justify-center flex-col h-full bg-goku rounded-md p-4">
              <p className="text-2xl font-bold mb-2">Chọn nhóm người dùng</p>
              <p className="text-trunks">Chọn nhóm người dùng để phân quyền</p>
            </div>
          ) : (
            <div>
              <h4 className="text-sm mb-3">
                Nhóm người dùng đang chọn:{" "}
                <span className="font-semibold text-primary">
                  {customerRoles.find((role) => role.id === selectedRole)?.name}
                </span>
              </h4>
              {isLoading && (
                <div className="flex flex-col items-center justify-center py-8">
                  <Loader2 className="size-6 animate-spin" />
                  <p className="text-sm text-trunks mt-2">Đang tải menu...</p>
                </div>
              )}
              {error && (
                <div className="flex items-center justify-center p-4 border border-red-500 rounded-md bg-red-50 text-sm">
                  <p className="text-red-500">Lỗi: {error.message}</p>
                </div>
              )}
              {bodyData && (
                <div>
                  <div className="border rounded-md h-[calc(100vh-300px)] overflow-y-auto">
                    <Table>
                      <TableHeader className="bg-goku">
                        <TableRow>
                          <TableHead>STT</TableHead>
                          <TableHead>Tên chức năng</TableHead>
                          <TableHead className="text-center">Sửa</TableHead>
                          <TableHead className="text-center">Chỉ đọc</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {bodyData?.map((item, index) => (
                          <TableRow key={item.id}>
                            <TableCell className="font-medium">
                              {index + 1}
                            </TableCell>
                            <TableCell>
                              {item?.menuName || item?.menu}
                            </TableCell>
                            <TableCell className="text-center">
                              <Checkbox
                                checked={item.edit}
                                onCheckedChange={(checked) => {
                                  const indexItem = bodyData.findIndex(
                                    (x) => x.id === item.id
                                  );
                                  const newData = [...bodyData];
                                  newData[indexItem].edit = checked as boolean;
                                  setBodyData(newData);
                                }}
                              />
                            </TableCell>
                            <TableCell className="text-center">
                              <Checkbox
                                checked={item.readOnly}
                                onCheckedChange={(checked) => {
                                  const indexItem = bodyData.findIndex(
                                    (x) => x.id === item.id
                                  );
                                  const newData = [...bodyData];
                                  newData[indexItem].readOnly =
                                    checked as boolean;
                                  setBodyData(newData);
                                }}
                              />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  <div className="flex mt-4 justify-end gap-2">
                    <Button>Cập nhật quyền</Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserRolesClient;
