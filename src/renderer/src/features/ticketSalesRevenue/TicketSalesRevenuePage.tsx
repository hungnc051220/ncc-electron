import type { TabsProps } from "antd";
import { Breadcrumb, DatePicker, Tabs } from "antd";
import type { TimeRangePickerProps } from "antd";
import TabRevenueByFilm from "./components/TabRevenueByFilm";
import TabRevenueByStaff from "./components/TabRevenueByStaff";
import { Link } from "react-router";
import dayjs from "dayjs";
import { useState } from "react";

const { RangePicker } = DatePicker;

const rangePresets: TimeRangePickerProps["presets"] = [
  { label: "7 ngày trước", value: [dayjs().add(-7, "d"), dayjs()] },
  { label: "14 ngày trước", value: [dayjs().add(-14, "d"), dayjs()] },
  { label: "30 ngày trước", value: [dayjs().add(-30, "d"), dayjs()] },
  { label: "90 ngày trước", value: [dayjs().add(-90, "d"), dayjs()] }
];

const TicketSalesRevenuePage = () => {
  const [fromDate, setFromDate] = useState(dayjs());
  const [toDate, setToDate] = useState(dayjs());

  const items: TabsProps["items"] = [
    {
      key: "1",
      label: "Doanh thu theo nhân viên",
      children: <TabRevenueByStaff fromDate={fromDate} toDate={toDate} />
    },
    {
      key: "2",
      label: "Doanh thu theo phim",
      children: <TabRevenueByFilm fromDate={fromDate} toDate={toDate} />
    }
  ];

  return (
    <div className="space-y-3 mt-4 px-4">
      <Breadcrumb
        items={[
          {
            title: <Link to="/">Trang chủ</Link>
          },
          {
            title: "Bán vé"
          },
          {
            title: "Thống kê doanh thu bán vé"
          }
        ]}
      />

      <Tabs
        defaultActiveKey="1"
        items={items}
        tabBarExtraContent={
          <RangePicker
            value={[fromDate, toDate]}
            format="DD/MM/YYYY"
            onChange={(dates) => {
              if (dates?.[0] && dates?.[1]) {
                setFromDate(dates[0]);
                setToDate(dates[1]);
              }
            }}
            presets={rangePresets}
            allowClear={false}
          />
        }
      />
    </div>
  );
};

export default TicketSalesRevenuePage;
