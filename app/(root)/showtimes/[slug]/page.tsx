import React from "react";
import Seats from "./components/seats";

const ShowtimePage = () => {
  return (
    <div className="pb-40">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-chichi text-lg font-medium">
            Buổi 09:15 - Ngày 17/09/2025
          </p>
          <p className="text-2xl font-bold mt-1">
            The Conjuring: Nghi lễ cuối cùng T16
          </p>
        </div>
        <div className="bg-goku py-[6px] px-3 rounded-lg">
          <p className="text-lg font-bold">Phòng 3</p>
        </div>
      </div>

      <Seats />
    </div>
  );
};

export default ShowtimePage;
