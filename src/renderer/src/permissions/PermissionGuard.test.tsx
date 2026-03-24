import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";
import PermissionGuard from "./PermissionGuard";

const canMock = vi.fn();

vi.mock("./usePermission", () => ({
  usePermission: () => ({
    can: canMock
  })
}));

describe("PermissionGuard", () => {
  const originalHash = window.location.hash;

  afterEach(() => {
    canMock.mockReset();
    window.location.hash = originalHash;
  });

  it("renders children in customer mode when bypass is enabled", () => {
    canMock.mockReturnValue(false);
    window.location.hash = "#/plan-screening/1?view=customer";

    render(
      <MemoryRouter initialEntries={["/plan-screening/1?view=customer"]}>
        <PermissionGuard permissionKey="plan_screening" allowInCustomerMode>
          <div>customer screen</div>
        </PermissionGuard>
      </MemoryRouter>
    );

    expect(screen.getByText("customer screen")).toBeInTheDocument();
  });

  it("redirects to fallback when permission is missing outside customer mode", () => {
    canMock.mockReturnValue(false);
    window.location.hash = "#/plan-screening/1";

    render(
      <MemoryRouter initialEntries={["/plan-screening/1"]}>
        <PermissionGuard permissionKey="plan_screening" fallbackPath="/403">
          <div>staff screen</div>
        </PermissionGuard>
      </MemoryRouter>
    );

    expect(screen.queryByText("staff screen")).not.toBeInTheDocument();
  });
});
