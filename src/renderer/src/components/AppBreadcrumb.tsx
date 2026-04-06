import type { BreadcrumbProps } from "antd";
import { Breadcrumb } from "antd";
import type { ReactNode } from "react";
import { Link, matchPath, useLocation } from "react-router";
import { navConfig, type NavConfigItem } from "./navConfig";

type AppBreadcrumbItem =
  | string
  | {
      title: ReactNode;
      to?: string;
    };

interface AppBreadcrumbProps {
  items?: AppBreadcrumbItem[];
  homeLabel?: ReactNode;
  homeTo?: string;
  showHome?: boolean;
}

type NormalizedBreadcrumbItem = NonNullable<BreadcrumbProps["items"]>[number];

const normalizeItem = (item: AppBreadcrumbItem): NormalizedBreadcrumbItem => {
  if (typeof item === "string") {
    return { title: item };
  }

  return {
    title: item.to ? <Link to={item.to}>{item.title}</Link> : item.title
  };
};

const AppBreadcrumb = ({
  items,
  homeLabel = "Trang chủ",
  homeTo = "/",
  showHome = true
}: AppBreadcrumbProps) => {
  const { pathname } = useLocation();
  const findBreadcrumbItems = (
    configs: NavConfigItem[],
    parents: AppBreadcrumbItem[] = []
  ): AppBreadcrumbItem[] | null => {
    for (const item of configs) {
      const nextParents = [...parents, { title: item.label, to: item.to }];
      const candidates = item.matchPaths ?? (item.to ? [item.to.split("?")[0]] : []);

      if (candidates.some((candidate) => matchPath({ path: candidate, end: true }, pathname))) {
        return nextParents;
      }

      if (item.children?.length) {
        const matchedChildren = findBreadcrumbItems(item.children, nextParents);
        if (matchedChildren) {
          return matchedChildren;
        }
      }
    }

    return null;
  };

  const resolvedItems = items ?? findBreadcrumbItems(navConfig) ?? [];
  const breadcrumbItems: BreadcrumbProps["items"] = [
    ...(showHome
      ? [
          {
            title: <Link to={homeTo}>{homeLabel}</Link>
          }
        ]
      : []),
    ...resolvedItems.map(normalizeItem)
  ];

  return <Breadcrumb items={breadcrumbItems} />;
};

export type { AppBreadcrumbItem, AppBreadcrumbProps };
export default AppBreadcrumb;
