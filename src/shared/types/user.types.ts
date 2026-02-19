export interface UserProps {
  id: number;
  username: string;
  email: string;
  manufacturerId: number;
  customerFirstName: string;
  customerLastName: string;
  address: string;
  mobile: string;
  roleIds: string;
  isHidden: boolean;
  fullname: string;
}

export interface ChangePasswordProps {
  oldPassword: string;
  newPassword: string;
}

export interface ResetPasswordProps {
  userId: string;
  newPassword: string;
}

export interface CustomerRoleProps {
  id: number;
  name: string;
  freeShipping: boolean;
  taxExempt: boolean;
  active: boolean;
  isSystemRole: boolean;
  systemName: string;
}

export interface CustomerRoleMenuProps {
  id: number;
  customerRoleId: number;
  menu: string;
  menuName: string;
  edit: boolean;
  readOnly: boolean;
}
