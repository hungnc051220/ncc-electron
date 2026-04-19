import { useCreateScreeningRoomChairs } from "@renderer/hooks/screeningRooms/useCreateScreeningRoomChairs";
import type { CreateChairsDto } from "@renderer/api/screeningRooms.api";
import { useScreeningRoomChairs } from "@renderer/hooks/screeningRooms/useScreeningRoomChairs";
import { useScreeningRooms } from "@renderer/hooks/screeningRooms/useScreeningRooms";
import { useSeatTypes } from "@renderer/hooks/seatTypes/useSeatTypes";
import { useGeneralData } from "@renderer/hooks/useGeneralData";
import { getApiErrorMessage } from "@renderer/lib/apiError";
import { cn } from "@renderer/lib/utils";
import { usePermission } from "@renderer/permissions/usePermission";
import type { DescriptionsProps } from "antd";
import { Button, Descriptions, Select, Space, Spin } from "antd";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router";
import Selecto from "react-selecto";
import { useAntdApp } from "@renderer/hooks/useAntdApp";

type FloorNumber = 1 | 2 | 3;
type SeatAssignments = Record<FloorNumber, Record<string, number>>;

const ScreeningRoomSeatMapPage = () => {
  const { message } = useAntdApp();

  const navigate = useNavigate();
  const { data: generalData } = useGeneralData();
  const { id } = useParams();
  const { can } = usePermission();
  const canConfigure = can("screening_rooms", "configure");
  const [versionCode, setVersionCode] = useState<string>("2D");
  const [seatType, setSeatType] = useState<number | undefined>(undefined);
  const [selectedFloor, setSelectedFloor] = useState<FloorNumber>(1);
  const [seatSize, setSeatSize] = useState(42);
  const [seatAssignments, setSeatAssignments] = useState<SeatAssignments>({
    1: {},
    2: {},
    3: {}
  });
  const [selectedSeatKeys, setSelectedSeatKeys] = useState<string[]>([]);
  const seatContainerRef = useRef<HTMLDivElement>(null);

  const createChairs = useCreateScreeningRoomChairs();

  const params = useMemo(
    () => ({
      current: 1,
      pageSize: 1,
      id: Number(id)
    }),
    [id]
  );

  const {
    data: screeningRooms,
    isLoading: isLoadingRooms,
    isFetching: isFetchingRooms
  } = useScreeningRooms(params);
  const {
    data: screeningRoomsChairs,
    isLoading: isLoadingChairs,
    isFetching: isFetchingChairs
  } = useScreeningRoomChairs({
    current: 1,
    pageSize: 100,
    roomId: Number(id)
  });

  const { data: seatTypes } = useSeatTypes({ current: 1, pageSize: 100 });

  const screeningRoom = screeningRooms?.data[0];
  const screeningRoomChairs = useMemo(
    () => screeningRoomsChairs?.data || [],
    [screeningRoomsChairs]
  );

  const floorConfigs = useMemo(
    () =>
      [
        {
          floor: 1 as FloorNumber,
          rows: screeningRoom?.deepSizeF1 || 0,
          cols: screeningRoom?.wideSizeF1 || 0
        },
        {
          floor: 2 as FloorNumber,
          rows: screeningRoom?.deepSizeF2 || 0,
          cols: screeningRoom?.wideSizeF2 || 0
        },
        {
          floor: 3 as FloorNumber,
          rows: screeningRoom?.deepSizeF3 || 0,
          cols: screeningRoom?.wideSizeF3 || 0
        }
      ].filter((item) => item.rows > 0 && item.cols > 0),
    [screeningRoom]
  );

  useEffect(() => {
    if (!floorConfigs.length) return;
    if (!floorConfigs.some((item) => item.floor === selectedFloor)) {
      setSelectedFloor(floorConfigs[0].floor);
    }
  }, [floorConfigs, selectedFloor]);

  const selectedFloorConfig = useMemo(
    () => floorConfigs.find((item) => item.floor === selectedFloor),
    [floorConfigs, selectedFloor]
  );

  const floorRowOffsets = useMemo(
    () =>
      floorConfigs.reduce(
        (offsets, item, index) => ({
          ...offsets,
          [item.floor]: floorConfigs
            .slice(0, index)
            .reduce((totalRows, floorConfig) => totalRows + floorConfig.rows, 0)
        }),
        { 1: 0, 2: 0, 3: 0 } as Record<FloorNumber, number>
      ),
    [floorConfigs]
  );
  const isSeatMapLoading = isLoadingRooms || isLoadingChairs || isFetchingRooms || isFetchingChairs;

  const parseChairPositions = (input: string): string[] => {
    if (!input) return [];
    const matches = input.match(/\[(\d+):(\d+)\]/g) || [];
    return matches.map((item) => item.replaceAll("[", "").replaceAll("]", ""));
  };

  const seatMapByFloor = useMemo(() => {
    const map: SeatAssignments = {
      1: {},
      2: {},
      3: {}
    };

    const matchedVersion = screeningRoomChairs.filter((item) => item.versionCode === versionCode);

    matchedVersion.forEach((item) => {
      (
        [
          [1, item.listChairF1],
          [2, item.listChairF2],
          [3, item.listChairF3]
        ] as [FloorNumber, string][]
      ).forEach(([floor, listChair]) => {
        parseChairPositions(listChair).forEach((seatKey) => {
          map[floor][seatKey] = item.positionId;
        });
      });
    });

    return map;
  }, [screeningRoomChairs, versionCode]);

  useEffect(() => {
    setSeatAssignments(seatMapByFloor);
    setSelectedSeatKeys([]);
  }, [seatMapByFloor]);

  const seatTypeColorMap = useMemo(
    () =>
      new Map((seatTypes?.data || []).map((item) => [item.id, item.color || "#8f8f8f"] as const)),
    [seatTypes]
  );

  const getRowLabel = (rowIdx: number, floor: FloorNumber) => {
    let labelIndex = floorRowOffsets[floor] + rowIdx;
    let label = "";

    do {
      label = String.fromCharCode(65 + (labelIndex % 26)) + label;
      labelIndex = Math.floor(labelIndex / 26) - 1;
    } while (labelIndex >= 0);

    return label;
  };

  const getSeatNumberByRule = (seatIdx: number, totalSeats: number) => {
    const ruleOrder = screeningRoom?.ruleOrder || "Tuần tự từ trái qua phải";

    if (ruleOrder === "Tuần tự từ phải qua trái") {
      return totalSeats - seatIdx;
    }

    if (ruleOrder === "Chẵn bên trái, lẻ bên phải") {
      const evenCount = Math.floor(totalSeats / 2);
      if (seatIdx < evenCount) {
        return (seatIdx + 1) * 2;
      }

      // Bên phải: số ghế tăng dần từ ngoài vào trong
      const oddIndexFromOutside = totalSeats - 1 - seatIdx;
      return oddIndexFromOutside * 2 + 1;
    }

    if (ruleOrder === "Lẻ bên trái, chẵn bên phải") {
      const oddCount = Math.ceil(totalSeats / 2);
      if (seatIdx < oddCount) {
        return seatIdx * 2 + 1;
      }

      // Bên phải: số ghế tăng dần từ ngoài vào trong
      const evenIndexFromOutside = totalSeats - 1 - seatIdx;
      return (evenIndexFromOutside + 1) * 2;
    }

    return seatIdx + 1;
  };

  const getContrastTextColor = (backgroundColor: string) => {
    const normalized = backgroundColor.trim().toLowerCase();
    if (!normalized || normalized === "transparent") {
      return "#374151";
    }

    // Explicit light seat colors from business data
    if (normalized === "#ffffff" || normalized === "#ffff00" || normalized === "#ffd700") {
      return "#111827";
    }

    let r = 0;
    let g = 0;
    let b = 0;

    const parseRgbText = (value: string) => {
      const parts = value.match(/\d+(\.\d+)?/g);
      if (!parts || parts.length < 3) return null;
      return {
        r: Number(parts[0]),
        g: Number(parts[1]),
        b: Number(parts[2])
      };
    };

    if (normalized.startsWith("#")) {
      const hex = normalized.slice(1);
      if (hex.length === 3) {
        r = parseInt(hex[0] + hex[0], 16);
        g = parseInt(hex[1] + hex[1], 16);
        b = parseInt(hex[2] + hex[2], 16);
      } else if (hex.length >= 6) {
        r = parseInt(hex.slice(0, 2), 16);
        g = parseInt(hex.slice(2, 4), 16);
        b = parseInt(hex.slice(4, 6), 16);
      }
    } else if (normalized.startsWith("rgb")) {
      const rgb = parseRgbText(normalized);
      if (rgb) {
        r = rgb.r;
        g = rgb.g;
        b = rgb.b;
      }
    } else if (typeof window !== "undefined" && typeof document !== "undefined") {
      // Resolve CSS keywords / hsl / named colors (white, gold, yellow...) to rgb.
      const temp = document.createElement("span");
      temp.style.color = normalized;
      temp.style.position = "absolute";
      temp.style.visibility = "hidden";
      temp.style.pointerEvents = "none";
      document.body.appendChild(temp);
      const computed = window.getComputedStyle(temp).color;
      document.body.removeChild(temp);
      const rgb = parseRgbText(computed);
      if (rgb) {
        r = rgb.r;
        g = rgb.g;
        b = rgb.b;
      }
    }

    // Perceived luminance
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance >= 0.6 ? "#111827" : "#ffffff";
  };

  const calculateSeatSize = useCallback(() => {
    const container = seatContainerRef.current;
    if (!container || floorConfigs.length === 0) return;

    const usableWidth = Math.floor(container.clientWidth);
    const usableHeight = Math.floor(container.clientHeight);

    let maxRows = 0;
    let maxSeatsPerRow = 0;

    floorConfigs.forEach((item) => {
      maxRows = Math.max(maxRows, item.rows);
      maxSeatsPerRow = Math.max(maxSeatsPerRow, item.cols);
    });

    if (!maxRows || !maxSeatsPerRow) return;

    const seatGap = 4;
    const rowGap = 4;
    const safety = 8;
    const totalItems = maxSeatsPerRow + 2;

    const heightSeat = Math.floor((usableHeight - rowGap * (maxRows - 1) - safety) / maxRows);
    const widthSeat = Math.floor((usableWidth - seatGap * (totalItems - 1) - safety) / totalItems);

    let size = Math.min(heightSeat, widthSeat);
    size = Math.max(12, Math.min(size, 42));

    const realGridWidth = size * totalItems + seatGap * (totalItems - 1);
    if (realGridWidth > usableWidth) size -= 1;

    setSeatSize(size);
  }, [floorConfigs]);

  useEffect(() => {
    const container = seatContainerRef.current;
    if (!container) return;

    let raf1 = 0;
    let raf2 = 0;

    const runFit = () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
      raf1 = requestAnimationFrame(() => {
        raf2 = requestAnimationFrame(() => {
          calculateSeatSize();
        });
      });
    };

    const observer = new ResizeObserver(runFit);
    observer.observe(container);
    runFit();

    return () => {
      observer.disconnect();
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
    };
  }, [calculateSeatSize]);

  const handleSelectSeats = (e: { selected: (HTMLElement | SVGElement)[] }) => {
    const keys = e.selected
      .map((item) => item.getAttribute("data-seat-key"))
      .filter(Boolean) as string[];
    setSelectedSeatKeys(keys);
  };

  const handleApplySeatType = () => {
    if (!seatType || selectedSeatKeys.length === 0) return;

    setSeatAssignments((prev) => {
      const next: SeatAssignments = {
        1: { ...prev[1] },
        2: { ...prev[2] },
        3: { ...prev[3] }
      };

      selectedSeatKeys.forEach((seatKey) => {
        next[selectedFloor][seatKey] = seatType;
      });

      return next;
    });

    setSelectedSeatKeys([]);
  };

  const buildChairListString = (seatKeys: string[]) => {
    if (!seatKeys.length) return "";
    return seatKeys
      .map((seatKey) => {
        const [row, col] = seatKey.split(":").map((v) => Number(v));
        return { row, col };
      })
      .sort((a, b) => (a.row === b.row ? a.col - b.col : a.row - b.row))
      .map((seat) => `[${seat.row}:${seat.col}]`)
      .join(",");
  };

  const buildCreateChairsPayload = (): CreateChairsDto[] => {
    const roomId = Number(id);
    if (!roomId || Number.isNaN(roomId)) return [];

    const positionIdSet = new Set<number>();
    (Object.keys(seatAssignments) as unknown as FloorNumber[]).forEach((floor) => {
      Object.values(seatAssignments[floor]).forEach((positionId) => {
        if (positionId) positionIdSet.add(positionId);
      });
    });

    return Array.from(positionIdSet).map((positionId) => {
      const floor1Keys = Object.entries(seatAssignments[1])
        .filter(([, pid]) => pid === positionId)
        .map(([seatKey]) => seatKey);
      const floor2Keys = Object.entries(seatAssignments[2])
        .filter(([, pid]) => pid === positionId)
        .map(([seatKey]) => seatKey);
      const floor3Keys = Object.entries(seatAssignments[3])
        .filter(([, pid]) => pid === positionId)
        .map(([seatKey]) => seatKey);

      return {
        roomId,
        positionId,
        versionCode,
        listChairF1: buildChairListString(floor1Keys),
        listChairF2: buildChairListString(floor2Keys),
        listChairF3: buildChairListString(floor3Keys),
        quantityF1: floor1Keys.length,
        quantityF2: floor2Keys.length,
        quantityF3: floor3Keys.length
      };
    });
  };

  const handleSaveChairs = async () => {
    const payload = buildCreateChairsPayload();
    if (!payload.length) {
      message.warning("Không có dữ liệu ghế để lưu");
      return;
    }

    try {
      await createChairs.mutateAsync(payload);
      message.success("Cập nhật sơ đồ ghế thành công");
    } catch (error) {
      message.error(getApiErrorMessage(error, "Cập nhật sơ đồ ghế thất bại"));
    }
  };

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
    <div className="relative flex flex-col h-screen overflow-hidden select-none dark:text-white">
      <div className="flex items-center justify-between px-4 py-2 gap-3 shadow-sm bg-app-bg">
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

      <div className="flex-1 min-h-0 overflow-auto">
        <div className="bg-goku dark:bg-app-bg-container p-4 h-full flex flex-col">
          <fieldset className="border-t-3 border-jiren w-2/3 mx-auto">
            <legend className="mx-auto px-3 text-sm text-trunks font-bold">Màn hình</legend>
          </fieldset>

          {floorConfigs.length > 1 && (
            <div className="flex justify-center gap-3 mt-3">
              {floorConfigs.map((item) => (
                <p
                  key={item.floor}
                  onClick={() => setSelectedFloor(item.floor)}
                  className={`pr-1 border-b-2 text-sm font-semibold cursor-pointer transition-all hover:opacity-80 ${
                    selectedFloor === item.floor
                      ? "border-primary text-primary"
                      : "border-transparent"
                  }`}
                >
                  Tầng {item.floor}
                </p>
              ))}
            </div>
          )}

          <div
            className="flex-1 min-h-0 mt-4 overflow-auto seat-map-container"
            ref={seatContainerRef}
          >
            {isSeatMapLoading ? (
              <div className="h-full w-full flex items-center justify-center">
                <Spin size="large" tip="Đang tải sơ đồ ghế..." />
              </div>
            ) : selectedFloorConfig ? (
              <div className="w-full h-full flex justify-center items-center">
                <div className="flex flex-col gap-1">
                  {Array.from({ length: selectedFloorConfig.rows }).map((_, rowIdx) => {
                    const rowLabel = getRowLabel(rowIdx, selectedFloor);

                    return (
                      <div key={rowIdx} className="flex items-center gap-1">
                        <div
                          className="text-center font-semibold text-trunks"
                          style={{
                            width: `${seatSize}px`,
                            height: `${seatSize}px`,
                            fontSize: `${Math.max(10, seatSize * 0.3)}px`,
                            lineHeight: `${seatSize}px`
                          }}
                        >
                          {rowLabel}
                        </div>

                        {Array.from({ length: selectedFloorConfig.cols }).map((_, seatIdx) => {
                          const seatKey = `${rowIdx}:${seatIdx}`;
                          const positionId = seatAssignments[selectedFloor][seatKey];
                          const seatColor = positionId
                            ? seatTypeColorMap.get(positionId) || "#8f8f8f"
                            : "transparent";
                          const seatNo = getSeatNumberByRule(seatIdx, selectedFloorConfig.cols);
                          const seatCode = `${rowLabel}${seatNo}`;
                          const isSelected = selectedSeatKeys.includes(seatKey);
                          const seatTextColor = isSelected
                            ? "#ffffff"
                            : getContrastTextColor(seatColor);

                          return (
                            <div
                              key={seatKey}
                              title={`Hàng ${rowIdx + 1} - Ghế ${seatIdx + 1}`}
                              className={cn(
                                "relative rounded-sm flex items-center justify-center selectable-seat",
                                "border border-app-border cursor-pointer",
                                isSelected && "bg-whis border-whis"
                              )}
                              data-seat-key={seatKey}
                              style={{
                                backgroundColor: isSelected ? undefined : seatColor,
                                width: `${seatSize}px`,
                                height: `${seatSize}px`
                              }}
                            >
                              <p
                                className="leading-none font-semibold"
                                style={{
                                  fontSize: `${Math.max(9, seatSize * 0.25)}px`,
                                  color: seatTextColor,
                                  textShadow:
                                    seatTextColor === "#ffffff"
                                      ? "0 1px 1px rgba(0, 0, 0, 0.45)"
                                      : "0 1px 1px rgba(255, 255, 255, 0.25)"
                                }}
                              >
                                {seatCode}
                              </p>
                            </div>
                          );
                        })}

                        <div
                          className="text-center font-semibold text-trunks"
                          style={{
                            width: `${seatSize}px`,
                            height: `${seatSize}px`,
                            fontSize: `${Math.max(10, seatSize * 0.3)}px`,
                            lineHeight: `${seatSize}px`
                          }}
                        >
                          {rowLabel}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <p className="text-center text-sm text-gray-500 mt-8">Không có dữ liệu sơ đồ ghế</p>
            )}
          </div>

          <Selecto
            key={`seat-map-selecto-${selectedFloor}`}
            dragContainer=".seat-map-container"
            selectableTargets={[".selectable-seat"]}
            hitRate={0}
            selectByClick={true}
            selectFromInside={true}
            toggleContinueSelect={["shift"]}
            ratio={0}
            onSelect={handleSelectSeats}
            onSelectEnd={canConfigure ? handleApplySeatType : undefined}
          />
        </div>
      </div>

      <div className="bg-jiren dark:bg-app-bg border-t border-gray-300 dark:border-app-border shrink-0 px-2">
        <div className="p-2 flex gap-10 items-center justify-center">
          <Descriptions items={items} size="small" className="max-w-100" />
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
                disabled={!canConfigure}
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
                label: item.name,
                color: item.color
              }))}
              onChange={(value) => setSeatType(value)}
              className="w-50"
              placeholder="Chọn loại ghế"
              disabled={!canConfigure}
              optionRender={(option) => (
                <Space>
                  <div
                    style={{ backgroundColor: option.data.color }}
                    className="w-6 h-4 rounded-sm border border-gray-300"
                  />
                  <p>{option.data.label}</p>
                </Space>
              )}
            />
          </div>
          <Button
            className="h-20"
            type="primary"
            onClick={handleSaveChairs}
            disabled={!canConfigure}
            loading={createChairs.isPending}
          >
            Cập nhật
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ScreeningRoomSeatMapPage;
