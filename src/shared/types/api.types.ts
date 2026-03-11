export interface ApiResponse<T> {
  data: T[];
  total: number;
  current: number;
  pageCount: number;
  pageSize: number;
}
export interface ApiError {
  message: string;
  error: string;
  statusCode: number;
  timestamp: string;
}

export interface MediasoftApiResponse<T> {
  data: {
    pageIndex: number;
    totalPages: number;
    totalItems: number;
    pageSize: number;
    items: T[];
    hasPreviousPage: boolean;
    hasNextPage: boolean;
  };
}
