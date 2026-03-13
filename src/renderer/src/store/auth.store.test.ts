import { describe, expect, it } from "vitest";
import { queryClient } from "@renderer/lib/queryClient";
import { usePermissionStore } from "./permission.store";
import { useAuthStore } from "./auth.store";

describe("auth.store", () => {
  it("stores auth data on login", () => {
    useAuthStore.getState().login("access-token", "refresh-token", 123);

    expect(useAuthStore.getState()).toMatchObject({
      token: "access-token",
      refreshToken: "refresh-token",
      userId: 123,
      isAuth: true
    });
  });

  it("clears auth state, permissions and cached queries on logout", () => {
    useAuthStore.getState().login("access-token", "refresh-token", 123);
    usePermissionStore.getState().setAssignments([
      {
        permissionKey: "yearly_report",
        actions: { access: true, export: true }
      }
    ]);
    queryClient.setQueryData(["yearly-report", 2026], [{ manufacturerName: "NCC" }]);

    useAuthStore.getState().logout();

    expect(useAuthStore.getState()).toMatchObject({
      token: null,
      refreshToken: null,
      userId: null,
      isAuth: false
    });
    expect(usePermissionStore.getState().assignments).toEqual([]);
    expect(queryClient.getQueryData(["yearly-report", 2026])).toBeUndefined();
  });
});
