export interface BatchProps {
  batchId: number;
  batchName: string;
  valueType: number;
  valueTypeName: string;
  minOrderAmount: number;
  discountValue: number;
  rewardTextValue: string;
  startAt: string;
  endAt: string;
  vouchers: VoucherProps[];
}

export interface VoucherProps {
  id: number;
  code: string;
  expiresAt: string;
  usageLimit: number;
}

export interface BatchVoucherProps {
  id: number;
  codePrefix: string;
  name: string;
  description: string;
  currencyCode: string;
  totalQuantity: number;
  usedCount: number;
  generatedQuantity: number;
  startAt: string;
  endAt: string;
  status: number;
  minOrderAmount: number;
  perCustomerLimit: number;
  createdBy: number;
  createdAt: string;
  valueType: number;
  discountValue: number;
  rewardTextValue: string;
  isDistributedByRule: boolean;
  isSystemVoucher: boolean;
  appliedMovieVersions: number[];
  appliedSalesChannels: number[];
  distributionRules: DistributionRuleProps[];
}

export interface DistributionRuleProps {
  memberTierId: number;
  memberTierName: string;
  percent: number;
}
