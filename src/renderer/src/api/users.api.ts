import { api } from "@renderer/api/client";
import { ApiResponse, UserProps } from "@renderer/types";
import queryString from "query-string";

export interface UsersQuery {
  current: number;
  pageSize: number;
  roleId?: number;
  keyword?: string;
}

export interface UserDto {
  id?: number;
  roleIds: number[];
  customerFirstName: string;
  manufacturerId: number;
  address?: string;
  email: string;
  mobile: string;
  username: string;
  password?: string;
  confirmPassword?: string;
  isHidden?: boolean;
}

export interface UserChangePasswordDto {
  password: string;
  new_password: string;
}

export const usersApi = {
  getAll: async (params: UsersQuery): Promise<ApiResponse<UserProps>> => {
    const { current, pageSize, roleId, keyword } = params;

    const filter: Record<string, unknown> = {};

    if (roleId) {
      filter.roleId = roleId;
    }

    if (keyword) {
      filter.keyword = keyword;
    }

    const queryObject: Record<string, unknown> = {
      current,
      pageSize
    };

    if (Object.keys(filter).length > 0) {
      queryObject.filter = JSON.stringify(filter);
    }

    const query = queryString.stringify(queryObject, {
      skipEmptyString: true,
      skipNull: true
    });

    const res = await api.get(`/api/pos/staff?${query}`);

    return res.data;
  },
  getDetail: async (id: number): Promise<UserProps> => {
    const res = await api.get(`/api/pos/staff/${id}`);
    return res.data;
  },
  create: async (dto: UserDto) => {
    const res = await api.post("/api/pos/staff", dto);
    return res.data;
  },
  update: async (id: number, dto: UserDto) => {
    const res = await api.patch(`/api/pos/staff/${id}`, dto);
    return res.data;
  },
  delete: async (id: number) => {
    const res = await api.delete(`/api/pos/staff/${id}`);
    return res.data;
  },
  changePassword: async (dto: UserChangePasswordDto) => {
    const res = await api.post("/api/pos/staff/change-password", dto);
    return res.data;
  }
};
