import AppBreadcrumb from "@renderer/components/AppBreadcrumb";
import FullHeightTabs from "@renderer/components/FullHeightTabs";
import PageHeader from "@renderer/components/PageHeader";
import type { TabsProps } from "antd";
import type { ReactNode } from "react";
import { useCallback, useMemo, useState } from "react";
import PaymentScheduleTab from "./components/paymentScheduleTab";
import RevenueSharingTab from "./components/revenueSharingTab";

const REVENUE_SHARING_TAB_KEY = "revenue-sharing";
const PAYMENT_SCHEDULE_TAB_KEY = "payment-schedule";

const RevenueSharingPage = () => {
  const [activeKey, setActiveKey] = useState(REVENUE_SHARING_TAB_KEY);
  const [tabActions, setTabActions] = useState<Record<string, ReactNode>>({});

  const handleActionsChange = useCallback((key: string, actions: ReactNode) => {
    setTabActions((prev) => ({
      ...prev,
      [key]: actions
    }));
  }, []);

  const items: TabsProps["items"] = useMemo(
    () => [
      {
        key: REVENUE_SHARING_TAB_KEY,
        label: "Phân chia doanh thu",
        forceRender: true,
        children: (
          <RevenueSharingTab
            onActionsChange={(actions) => handleActionsChange(REVENUE_SHARING_TAB_KEY, actions)}
          />
        )
      },
      {
        key: PAYMENT_SCHEDULE_TAB_KEY,
        label: "Tiến độ thanh toán",
        forceRender: true,
        children: (
          <PaymentScheduleTab
            onActionsChange={(actions) => handleActionsChange(PAYMENT_SCHEDULE_TAB_KEY, actions)}
          />
        )
      }
    ],
    [handleActionsChange]
  );

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 overflow-hidden px-4 pt-4 pb-3">
      <PageHeader left={<AppBreadcrumb />} />

      <FullHeightTabs
        activeKey={activeKey}
        onChange={setActiveKey}
        type="card"
        items={items}
        tabBarExtraContent={tabActions[activeKey]}
      />
    </div>
  );
};

export default RevenueSharingPage;
