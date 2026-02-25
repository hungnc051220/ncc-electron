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
