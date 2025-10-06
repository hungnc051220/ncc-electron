import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import AddUserModal from "@/components/users/add-user-modal";
import { columns } from "@/components/users/columns";
import { DataTable } from "@/components/users/data-table";
import Filter from "@/components/users/filter";
import { users } from "@/lib/fake-data";

const Users = () => {
  return (
    <div className="space-y-8">
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
                <BreadcrumbPage>Quản lý người dùng</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          <h3 className="font-bold text-2xl mt-1">Quản lý người dùng</h3>
        </div>
        <AddUserModal />
      </div>

      <Filter />
      <DataTable columns={columns} data={users} />
    </div>
  );
};

export default Users;
