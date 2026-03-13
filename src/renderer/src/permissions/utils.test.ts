import { describe, expect, it } from "vitest";
import {
  permissionActions,
  type CustomerRoleMenuProps,
  type PermissionAssignment
} from "@shared/types";
import {
  buildPermissionMatrix,
  canAccessRoute,
  hasPermission,
  legacyMenusToAssignments,
  mergePermissionAssignments,
  permissionMatrixToLegacyMenus
} from "./utils";

describe("permissions/utils", () => {
  it("builds a matrix with false defaults and applied assignments", () => {
    const rows = buildPermissionMatrix([
      {
        permissionKey: "users",
        actions: {
          access: true,
          list: true,
          update: true
        }
      }
    ]);

    const usersRow = rows.find((row) => row.key === "users");

    expect(usersRow).toBeDefined();
    expect(usersRow?.values.access).toBe(true);
    expect(usersRow?.values.list).toBe(true);
    expect(usersRow?.values.update).toBe(true);
    expect(usersRow?.values.delete).toBe(false);
    expect(Object.keys(usersRow?.values ?? {})).toEqual(permissionActions);
  });

  it("merges assignment groups with OR semantics", () => {
    const merged = mergePermissionAssignments([
      [
        {
          permissionKey: "users",
          actions: { access: true, list: true }
        }
      ],
      [
        {
          permissionKey: "users",
          actions: { update: true }
        },
        {
          permissionKey: "films",
          actions: { access: true }
        }
      ]
    ]);

    expect(merged).toContainEqual({
      permissionKey: "users",
      actions: expect.objectContaining({
        access: true,
        list: true,
        update: true
      })
    });
    expect(merged).toContainEqual({
      permissionKey: "films",
      actions: expect.objectContaining({
        access: true
      })
    });
  });

  it("converts legacy menus to permission assignments", () => {
    const legacyMenus: CustomerRoleMenuProps[] = [
      {
        id: 1,
        customerRoleId: 99,
        menu: "yearly_report",
        menuName: "Báo cáo năm",
        readOnly: true,
        edit: false
      }
    ];

    expect(legacyMenusToAssignments(legacyMenus)).toContainEqual({
      permissionKey: "yearly_report",
      actions: {
        access: true,
        list: true,
        view: true,
        create: false,
        update: false,
        delete: false,
        configure: false
      }
    });
  });

  it("converts matrix rows back to legacy menus", () => {
    const rows = buildPermissionMatrix([
      {
        permissionKey: "yearly_report",
        actions: {
          access: true,
          list: true,
          view: true,
          export: true
        }
      }
    ]).filter((row) => row.key === "yearly_report");

    expect(permissionMatrixToLegacyMenus(7, rows)).toEqual([
      {
        id: 1,
        customerRoleId: 7,
        menu: "yearly_report",
        menuName: "Báo cáo năm",
        readOnly: true,
        edit: true
      }
    ]);
  });

  it("checks action and route access correctly", () => {
    const assignments: PermissionAssignment[] = [
      {
        permissionKey: "users",
        actions: { access: true, list: true }
      },
      {
        permissionKey: "yearly_report",
        actions: { access: true, export: true }
      }
    ];

    expect(hasPermission(assignments, "yearly_report", "export")).toBe(true);
    expect(hasPermission(assignments, "yearly_report", "delete")).toBe(false);
    expect(canAccessRoute(assignments, "/yearly-report")).toBe(true);
    expect(canAccessRoute(assignments, "/films")).toBe(false);
    expect(canAccessRoute(assignments, "/missing-route")).toBe(false);
  });
});
