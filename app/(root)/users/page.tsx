import { getCustomerRoles, getUsers } from "@/data/loaders-server";
import UsersClient from "./components/users-client";

interface UsersPageProps {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}

const UsersPage = async ({ searchParams }: UsersPageProps) => {
  const filter = await searchParams;
  const roleId = filter?.roleId === "all" ? undefined : filter?.roleId;
  const searchText = filter?.searchText;
  const page = filter?.page ? parseInt(filter.page, 10) || 1 : 1;
  const pageSize = filter?.pageSize ? parseInt(filter.pageSize, 10) || 10 : 10;

  const [users, customerRoles] = await Promise.all([
    getUsers({ roleId, searchText, page, pageSize }),
    getCustomerRoles(),
  ]);

  return <UsersClient data={users} customerRoles={customerRoles} page={page} />;
};

export default UsersPage;
