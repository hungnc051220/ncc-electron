"use client";

import { cn } from "@/lib/utils";
import { useState } from "react";
import TabFilm from "./tab-film";
import TabScheduling from "./tab-scheduling";

interface TabsListProps {
  planCinemaId?: number;
}

const TabsList = ({ planCinemaId }: TabsListProps) => {
  const [currentTab, setCurrentTab] = useState(0);

  return (
    <div>
      <div className="mt-4 flex items-center">
        <button
          className={cn(
            "py-2 px-4 border-b-2 text-sm font-bold border-beerus",
            currentTab === 0 && "text-primary border-primary"
          )}
          onClick={() => setCurrentTab(0)}
        >
          Danh sách phim
        </button>
        <button
          className={cn(
            "py-2 px-4 border-b-2 text-sm font-bold border-beerus",
            currentTab === 1 && "text-primary border-primary"
          )}
          onClick={() => setCurrentTab(1)}
        >
          Giờ chiếu, phòng chiếu
        </button>
        <div className="border-b-2 border-beerus flex-1 self-end"></div>
      </div>

      {currentTab === 0 && <TabFilm planCinemaId={planCinemaId} />}
      {currentTab === 1 && <TabScheduling planCinemaId={planCinemaId} />}
    </div>
  );
};

export default TabsList;
