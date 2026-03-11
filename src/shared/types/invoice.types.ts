export interface InvoiceProps {
  id: number;
  orderId: number;
  partyA: string;
  address: string;
  taxCode: string;
  phoneNumber: string;
  email: string;
  citizenId: string;
  representative: string;
  position: string;
  imageUrl: string;
  note: string;
  status: InvoiceStatus;
  createdBy: number;
  createdAt: string;
  updatedBy: string;
  updatedAt: string;
  invoiceType: "personal" | "business";
  contractCode?: string;
}

export enum InvoiceStatus {
  NEW = "new",
  PROCESSING = "processing",
  COMPLETED = "completed"
}
