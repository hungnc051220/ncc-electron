import { Button } from "antd";

const ExportButton = () => {
  const exportExcel = () => {};

  return (
    <Button variant="solid" color="green" onClick={exportExcel}>
      Xuất Excel
    </Button>
  );
};

export default ExportButton;
