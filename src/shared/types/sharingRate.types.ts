export interface SharingRateProps {
  id: number;
  manufacturerId: number;
  filmId: number;
  fromDate: string;
  toDate: string;
  rate: number;
  createdOnUtc: string;
  updatedOnUtc: string;
  createdBy: number;
  updatedBy: string;
  deleted: boolean;
}

export interface SharingRatePaymentHistoryProps {
  itemId: number;
  manufacturerId: number;
  manufacturerName: string;
  filmId: number;
  filmName: string;
  paymentDate: string;
  paidAmount: number;
  note?: string;
  createdOnUtc: string;
  createdBy: number;
  updatedOnUtc: string;
  updatedBy: number;
  premieredDay: string;
}
