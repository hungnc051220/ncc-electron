import { getCustomerRoles } from "@/data/loaders";
import UserRolesClient from "./components/user-roles-client";

const UserRolesPage = async () => {
  const customerRoles = await getCustomerRoles();
  return <UserRolesClient customerRoles={customerRoles} />;
};

export default UserRolesPage;
