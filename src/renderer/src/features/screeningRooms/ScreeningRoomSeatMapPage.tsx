import { useScreeningRoomChairs } from "@renderer/hooks/screeningRooms/useScreeningRoomChairs";
import { useScreeningRooms } from "@renderer/hooks/screeningRooms/useScreeningRooms";
import { useSeatTypes } from "@renderer/hooks/seatTypes/useSeatTypes";
import { useGeneralData } from "@renderer/hooks/useGeneralData";
import type { DescriptionsProps } from "antd";
import { Button, Descriptions, Select } from "antd";
import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router";

const ScreeningRoomSeatMapPage = () => {
  const navigate = useNavigate();
  const { data: generalData } = useGeneralData();
  const { id } = useParams();
  const [versionCode, setVersionCode] = useState<string>("2D");
  const [seatType, setSeatType] = useState<number | undefined>(undefined);

  const params = useMemo(
    () => ({
      current: 1,
      pageSize: 1,
      id: Number(id)
    }),
    [id]
  );

  const { data: screeningRooms } = useScreeningRooms(params);
  const { data: screeningRoomsChairs } = useScreeningRoomChairs({
    current: 1,
    pageSize: 100,
    roomId: Number(id)
  });

  const { data: seatTypes } = useSeatTypes({ current: 1, pageSize: 100 });

  const screeningRoom = screeningRooms?.data[0];
  const screeningRoomChairs = screeningRoomsChairs?.data || [];

  const items: DescriptionsProps["items"] = [
    {
      key: "1",
      label: "Tầng",
      children: "1"
    },
    {
      key: "2",
      label: "Số hàng",
      children: screeningRoom?.deepSizeF1 || 0
    },
    {
      key: "3",
      label: "Số ghế",
      children: screeningRoom?.wideSizeF1 || 0
    },
    {
      key: "4",
      label: "Tầng",
      children: "2"
    },
    {
      key: "5",
      label: "Số hàng",
      children: screeningRoom?.deepSizeF2 || 0
    },
    {
      key: "6",
      label: "Số ghế",
      children: screeningRoom?.wideSizeF2 || 0
    },
    {
      key: "7",
      label: "Tầng",
      children: "3"
    },
    {
      key: "8",
      label: "Số hàng",
      children: screeningRoom?.deepSizeF3 || 0
    },
    {
      key: "9",
      label: "Số ghế",
      children: screeningRoom?.wideSizeF3 || 0
    }
  ];

  return (
    <div className="relative flex flex-col h-screen overflow-hidden select-none">
      <div className="flex items-center justify-between px-4 py-2 gap-3">
        <div className="flex-1 flex items-center gap-3">
          <p className="text-sm xl:text-lg font-bold">Sơ đồ ghế phòng chiếu</p>
        </div>
        <div className="rounded-lg flex items-center gap-4">
          <Button
            variant="outlined"
            className="ml-4"
            onClick={() => {
              sessionStorage.removeItem("lastTotal");
              navigate(-1);
            }}
          >
            Đóng
          </Button>
        </div>
      </div>

      <div className="flex-1"></div>

      <div className="bg-jiren dark:bg-app-bg border-t border-gray-300 dark:border-app-border shrink-0 px-2">
        <div className="p-2 flex gap-10 items-center justify-center">
          <Descriptions items={items} size="small" className="max-w-75" />
          <div className="text-sm space-y-2">
            <div className="flex items-center gap-2">
              <p className="w-30">Phiên bản</p>
              <Select
                value={versionCode}
                options={generalData?.filmVersions?.map((item) => ({
                  value: item.versionCode,
                  label: item.versionName
                }))}
                onChange={(value) => setVersionCode(value)}
                className="w-50"
                placeholder="Chọn phiên bản"
              />
            </div>
            <div className="flex items-center gap-2">
              <p className="w-30">Quy luật xếp ghế</p>
              <p className="font-semibold">{screeningRoom?.ruleOrder}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <p className="w-15">Loại ghế</p>
            <Select
              value={seatType}
              options={seatTypes?.data.map((item) => ({
                value: item.id,
                label: item.name
              }))}
              onChange={(value) => setSeatType(value)}
              className="w-50"
              placeholder="Chọn loại ghế"
            />
          </div>
          <Button className="h-20" type="primary">
            Cập nhật
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ScreeningRoomSeatMapPage;
