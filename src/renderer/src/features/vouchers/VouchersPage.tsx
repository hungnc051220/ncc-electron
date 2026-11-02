import AppBreadcrumb from "@renderer/components/AppBreadcrumb";
import FullHeightTabs from "@renderer/components/FullHeightTabs";
import PageHeader from "@renderer/components/PageHeader";
import { usePermission } from "@renderer/permissions/usePermission";
import type { TabsProps } from "antd";
import type { ReactNode } from "react";
import { useCallback, useMemo, useState } from "react";
import { Navigate } from "react-router";
import PromotionVouchersTab from "./components/PromotionVouchersTab";
import PaperVouchersTab from "./paperVouchers/PaperVouchersTab";
import { resolvePaperVoucherPermissions } from "./paperVouchers/paperVoucherPermissions";

export const PROMOTION_VOUCHERS_TAB_KEY = "promotion-vouchers";
export const PAPER_VOUCHERS_TAB_KEY = "paper-vouchers";

const VouchersPage = () => {
  const { can } = usePermission();
  const [activeKey, setActiveKey] = useState<string>();
  const [tabActions, setTabActions] = useState<Record<string, ReactNode>>({});

  const canAccessPromotion = can("vouchers", "access");
  const paperPermissions = useMemo(() => resolvePaperVoucherPermissions(can), [can]);

  const handlePromotionActionsChange = useCallback((actions: ReactNode) => {
    setTabActions((prev) => ({ ...prev, [PROMOTION_VOUCHERS_TAB_KEY]: actions }));
  }, []);

  const handlePaperActionsChange = useCallback((actions: ReactNode) => {
    setTabActions((prev) => ({ ...prev, [PAPER_VOUCHERS_TAB_KEY]: actions }));
  }, []);

  const items = useMemo(() => {
    const tabs: NonNullable<TabsProps["items"]> = [];

    if (canAccessPromotion) {
      tabs.push({
        key: PROMOTION_VOUCHERS_TAB_KEY,
        label: "Chương trình khuyến mãi",
        children: <PromotionVouchersTab onActionsChange={handlePromotionActionsChange} />
      });
    }

    if (paperPermissions.access) {
      tabs.push({
        key: PAPER_VOUCHERS_TAB_KEY,
        label: "Voucher giấy",
        children: (
          <PaperVouchersTab
            permissions={paperPermissions}
            onActionsChange={handlePaperActionsChange}
          />
        )
      });
    }

    return tabs;
  }, [
    canAccessPromotion,
    handlePaperActionsChange,
    handlePromotionActionsChange,
    paperPermissions
  ]);

  const resolvedActiveKey = items.some((item) => item.key === activeKey)
    ? activeKey
    : items[0]?.key;

  // Route guard đã chặn khi thiếu cả hai quyền; đây là lớp phòng thủ cuối.
  if (!items.length) {
    return <Navigate to="/403" replace />;
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 overflow-hidden px-4 pt-4 pb-3">
      <PageHeader left={<AppBreadcrumb />} />

      <FullHeightTabs
        activeKey={resolvedActiveKey}
        onChange={setActiveKey}
        type="card"
        items={items}
        tabBarExtraContent={
          resolvedActiveKey ? (
            <div className="flex items-center gap-2">{tabActions[resolvedActiveKey]}</div>
          ) : undefined
        }
      />
    </div>
  );
};

export default VouchersPage;
