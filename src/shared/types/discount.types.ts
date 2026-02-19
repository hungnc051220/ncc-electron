export interface DiscountProps {
  id: number;
  discountName: string;
  discountType: string;
  discountAmount: number;
  discountRate: number;
  deleted: boolean;
  createdOnUtc: string;
  createdUser: string;
  updatedOnUtc: string;
  updatedUser: string;
}
