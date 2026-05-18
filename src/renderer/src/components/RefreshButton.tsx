import { ReloadOutlined } from "@ant-design/icons";
import { Button, type ButtonProps } from "antd";

interface RefreshButtonProps extends Omit<ButtonProps, "icon" | "children" | "onClick"> {
  onRefresh: () => void | Promise<unknown>;
  label?: string;
}

const RefreshButton = ({ onRefresh, label = "Làm mới", ...props }: RefreshButtonProps) => (
  <Button icon={<ReloadOutlined />} onClick={() => void onRefresh()} {...props}>
    {label}
  </Button>
);

export default RefreshButton;
