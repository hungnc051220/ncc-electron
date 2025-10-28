import { getUsers } from "@/data/loaders";
import MachineSerialsClient from "./components/machine-serials-client";

const MachineSerialsPage = async () => {
  const users = await getUsers();

  return <MachineSerialsClient initialData={users} />;
};

export default MachineSerialsPage;
