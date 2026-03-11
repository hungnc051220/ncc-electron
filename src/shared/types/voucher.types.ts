export interface BatchProps {
  batchId: number;
  batchName: string;
  valueType: number;
  valueTypeName: string;
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
