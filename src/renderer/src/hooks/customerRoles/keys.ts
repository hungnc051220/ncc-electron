export const customerRolesKeys = {
  all: ["customer-roles"] as const,
  getDetail: (id: number) => ["customer-role", id] as const
};
