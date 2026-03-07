export interface BaseResponse<T> {
  data: T;
  message?: string;
  status: number;
}

export interface User {
  id: string;
  email: string;
  name?: string;
}
