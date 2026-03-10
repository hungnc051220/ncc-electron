import { Button } from "antd";
import { PoweroffOutlined } from "@ant-design/icons";

const QuitApp = () => {
  const handleQuit = () => {
    window.api?.quitApp();
  };

  return <Button onClick={handleQuit} icon={<PoweroffOutlined className="text-red-500" />} />;
};

export default QuitApp;
