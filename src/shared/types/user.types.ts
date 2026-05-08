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

export interface CustomerPosProps {
  id: number;
  customerGuid: string;
  username: string;
  email: string;
  password: string;
  passwordFormatId: number;
  passwordSalt: string;
  isStaff: boolean;
  active: boolean;
  fullName: string;
  customerFirstName: string;
  customerLastName: string;
  birthDay: string;
  mobile: string;
  idCard: string;
  sex: boolean;
  deleted: boolean;
  lastIpAddress: string;
  lastActivityDateUtc: string;
  marriage: boolean;
  address: string;
  position: string;
  favour: string;
  pointReward: number;
  pointCard: number;
  cardCode: string;
  cardLevelName: string;
  currentCardId: number;
  cardIssued: boolean;
  lastVisitedPage: string;
  dateCreateCard: string;
  dateExpireCard: string;
  dateLevel: string;
  areaId: string;
  cityId: number;
  jobId: number;
  districtId: number;
  countryId: number;
  cardIssuedBy: string;
  otp: string;
  dateOTP: string;
  userType: string;
  registerType: string;
  studentIdCard: string;
  cardLevel: CardLevelProps;
}

export interface CardLevelProps {
  currentTierName: string;
  currentTierThreshold: number;
  nextTierName: string;
  nextTierThreshold: number;
  totalSpendingThisYear: number;
  remainingToNextTier: number;
  currentPointBalance: number;
  pendingPoints: number;
  expiredPoints: number;
}
