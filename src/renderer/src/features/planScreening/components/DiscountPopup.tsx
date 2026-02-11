"use client";

import { formatMoney } from "@renderer/lib/utils";
import { DiscountProps } from "@renderer/types";
import { Button, Modal, Table } from "antd";
import type { TableProps } from "antd";
import { useState } from "react";

interface DiscountPopupProps {
  data?: DiscountProps[];
  openDiscount: boolean;
  setOpenDiscount: (open: boolean) => void;
  setSelectedDiscount: (discount: DiscountProps | undefined) => void;
}

const DiscountPopup = ({
  data,
  openDiscount,
  setOpenDiscount,
  setSelectedDiscount
}: DiscountPopupProps) => {
  const [selectedKey, setSelectedKey] = useState<React.Key | null>(null);
  const [selectedItem, setSelectedItem] = useState<DiscountProps | undefined>(undefined);

  const columns: TableProps<DiscountProps>["columns"] = [
    {
      title: "STT",
      key: "no",
      render: (_, __, index: number) => index + 1
    },
    {
      title: "Khuyến mại, giảm giá",
      dataIndex: "discountName",
      key: "discountName"
    },
    {
      title: "Hình thức",
      dataIndex: "discountType",
      key: "discountType"
    },
    {
      title: "Số tiền",
      dataIndex: "discountAmount",
      key: "discountAmount",
      render: (value: number) => (value ? formatMoney(value) : "-"),
      align: "right"
    },
    {
      title: "Tỷ lệ (%)",
      dataIndex: "discountRate",
      key: "discountRate",
      render: (value: number) => (value ? `${value}%` : "-"),
      align: "right"
    }
  ];

  const onOk = () => {
    if (selectedItem) {
      setSelectedDiscount(selectedItem);
    }
    setOpenDiscount(false);
  };

  const onRemoveDiscount = () => {
    setSelectedDiscount(undefined);
    setSelectedKey(null);
    setSelectedItem(undefined);
    setOpenDiscount(false);
  };

  return (
    <Modal
      title="Chọn hình thức giảm giá"
      open={openDiscount}
      onOk={onOk}
      onCancel={() => setOpenDiscount(false)}
      width={800}
      footer={(_, { OkBtn, CancelBtn }) => (
        <>
          <CancelBtn />
          <Button variant="outlined" color="red" onClick={onRemoveDiscount}>
            Bỏ chọn giảm giá
          </Button>
          <OkBtn />
        </>
      )}
    >
      <Table
        rowKey={(row) => row.id}
        dataSource={data || []}
        columns={columns}
        size="small"
        pagination={false}
        rowSelection={{
          type: "radio",
          selectedRowKeys: selectedKey ? [selectedKey] : [],
          onChange: (selectedRowKeys, selectedRows) => {
            setSelectedKey(selectedRowKeys[0]);
            setSelectedItem(selectedRows[0]);
          }
        }}
      />
    </Modal>
  );
};

export default DiscountPopup;
