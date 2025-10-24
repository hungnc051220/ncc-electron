import UsersClient from "@/components/users/users-client";
import { getUsers } from "@/data/loaders";

const Users = async () => {
  const users = await getUsers();

  return <UsersClient initialData={users} />;
};

export default Users;
