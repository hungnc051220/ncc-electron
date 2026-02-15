import { useAuthStore } from "@renderer/store/auth.store";
import { Button } from "antd";

const Logout = () => {
  const logout = useAuthStore((s) => s.logout);
  return (
    <Button variant="outlined" onClick={logout}>
      Đăng xuất
    </Button>
  );
};

export default Logout;
