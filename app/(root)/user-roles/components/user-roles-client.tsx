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
import { customToast } from "@/components/ui/custom-toast";
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
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

interface UserRolesClientProps {
  customerRoles: CustomerRoleProps[];
}

const UserRolesClient = ({ customerRoles }: UserRolesClientProps) => {
  const [selectedRole, setSelectedRole] = useState<number | null>(null);
  const [bodyData, setBodyData] = useState<CustomerRoleMenuProps[] | undefined>(
    undefined
  );

  const queryClient = useQueryClient();

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

  const updateRoleMenuMutation = useMutation({
    mutationFn: async (updateData: {
      actingGroups: CustomerRoleMenuProps[];
    }) => {
      console.log(updateData);
      const res = await fetch("/api/role-menu/update", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updateData),
      });

      const json = await res.json();

      if (!res.ok) {
        const message = json?.error || "Cập nhật quyền thất bại";
        throw new Error(message);
      }

      return json;
    },
    onSuccess: () => {
      customToast({
        title: "Cập nhật thành công",
        description: "Cập nhật quyền cho nhóm người dùng thành công",
      });
      // Refetch the role menu data to get the latest state
      queryClient.invalidateQueries({ queryKey: ["role-menu", selectedRole] });
    },
    onError: (error: Error) => {
      toast.error(`Lỗi: ${error.message}`);
    },
  });

  const handleUpdatePermissions = () => {
    if (!selectedRole || !bodyData) return;

    updateRoleMenuMutation.mutate({
      actingGroups: bodyData,
    });
  };

  useEffect(() => {
    setBodyData(data);
  }, [data]);

  return (
    <div className="space-y-4 xl:space-y-6 mt-4 xl:mt-10">
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
                <div className="flex flex-col items-center justify-center py-8 border rounded-md h-[calc(100vh-300px)] overflow-y-auto">
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
                    {bodyData.length > 0 ? (
                      <Table>
                        <TableHeader className="bg-goku">
                          <TableRow>
                            <TableHead>STT</TableHead>
                            <TableHead>Tên chức năng</TableHead>
                            <TableHead className="text-center">Sửa</TableHead>
                            <TableHead className="text-center">
                              Chỉ đọc
                            </TableHead>
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
                                    newData[indexItem].edit =
                                      checked as boolean;
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
                    ) : (
                      <div className="h-full w-full flex items-center justify-center text-trunks text-sm">
                        Không có dữ liệu
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      {bodyData && bodyData.length > 0 && (
        <div className="flex justify-end gap-2">
          <Button
            onClick={handleUpdatePermissions}
            disabled={updateRoleMenuMutation.isPending}
          >
            {updateRoleMenuMutation.isPending ? (
              <>
                <Loader2 className="size-4 animate-spin mr-2" />
                Đang cập nhật...
              </>
            ) : (
              <>Cập nhật quyền</>
            )}
          </Button>
        </div>
      )}
    </div>
  );
};

export default UserRolesClient;
