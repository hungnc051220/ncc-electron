import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import FullHeightTabs from "./FullHeightTabs";

const items = [
  {
    key: "first",
    label: "Tab thứ nhất",
    children: <div>Nội dung tab</div>
  }
];

describe("FullHeightTabs", () => {
  it("fills the available height through the Tabs semantic DOM", () => {
    const { container } = render(
      <FullHeightTabs
        items={items}
        className="custom-root"
        classNames={{ body: "custom-body", content: "custom-content" }}
      />
    );

    expect(container.firstElementChild).toHaveClass(
      "flex",
      "h-full",
      "min-h-0",
      "min-w-0",
      "flex-col",
      "custom-root"
    );
    expect(container.querySelector(".custom-body")).toHaveClass("h-full", "min-h-0", "min-w-0");
    expect(container.querySelector(".custom-content")).toHaveClass("h-full", "min-h-0", "min-w-0");
    expect(screen.getByText("Nội dung tab")).toBeInTheDocument();
  });

  it("preserves function-based semantic class names", () => {
    const { container } = render(
      <FullHeightTabs
        items={items}
        classNames={() => ({
          header: "custom-header",
          body: "custom-body-function",
          content: "custom-content-function"
        })}
      />
    );

    expect(container.querySelector(".custom-header")).toBeInTheDocument();
    expect(container.querySelector(".custom-body-function")).toHaveClass("h-full", "min-h-0");
    expect(container.querySelector(".custom-content-function")).toHaveClass("h-full", "min-h-0");
  });
});
