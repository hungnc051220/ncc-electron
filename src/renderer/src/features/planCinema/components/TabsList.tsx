import FullHeightTabs from "@renderer/components/FullHeightTabs";
import TabFilm from "./tabFilm";
// import TabScheduling from "./tabScheduling";
import type { TabsProps } from "antd";
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

  return <FullHeightTabs defaultActiveKey="1" items={items} className="mt-3" type="card" />;
};

export default TabsList;
