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
