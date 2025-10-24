export interface User {
  group: string;
  firstName: string;
  lastName: string;
  manufactureId: string;
  address: string;
  email: string;
  phoneNumber: string;
  userName: string;
  password: string;
}

export interface ShowtimesProps {
  id: number;
  title: string;
  times: string[];
}
