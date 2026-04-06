import TabFilm from "./tabFilm";
// import TabScheduling from "./tabScheduling";
import { Tabs, type TabsProps } from "antd";
import TabScheduling from "./tabScheduling";

interface TabsListProps {
  planCinemaId?: number;
}

const TabsList = ({ planCinemaId }: TabsListProps) => {
  const items: TabsProps["items"] = [
    {
      key: "1",
      label: "Danh sách phim",
      children: <TabFilm planCinemaId={planCinemaId} />
    },
    {
      key: "2",
      label: "Giờ chiếu, phòng chiếu",
      children: <TabScheduling key={planCinemaId} planCinemaId={planCinemaId} />
    }
  ];

  return (
    <Tabs
      defaultActiveKey="1"
      items={items}
      className="mt-3 flex h-full min-h-0 min-w-0 flex-col [&_.ant-tabs-content-holder]:min-h-0 [&_.ant-tabs-content-holder]:min-w-0 [&_.ant-tabs-content-holder]:flex-1 [&_.ant-tabs-content]:h-full [&_.ant-tabs-content]:min-h-0 [&_.ant-tabs-content]:min-w-0 [&_.ant-tabs-tabpane]:h-full [&_.ant-tabs-tabpane]:min-h-0 [&_.ant-tabs-tabpane]:min-w-0"
      type="card"
    />
  );
};

export default TabsList;
