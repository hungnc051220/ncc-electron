import type { ColumnsType } from "antd/es/table";

type WithPricesMap = {
  pricesMap: Record<number, number>;
};

export const buildPriceColumns = <T extends WithPricesMap>(allPrices: number[]): ColumnsType<T> =>
  allPrices.map((p) => ({
    title: (p / 1000).toString(),
    dataIndex: ["pricesMap", p],
    align: "center",
    width: 80,
    render: (_, row) => row.pricesMap[p] ?? ""
  }));
