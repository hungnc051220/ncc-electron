import { Button, Result } from "antd";
import { useLocation, useNavigate } from "react-router";

type ForbiddenState = {
  from?: string;
};

const ForbiddenPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as ForbiddenState | null;

  const handleRetry = () => {
    if (state?.from) {
      navigate(state.from, { replace: true });
      return;
    }

    navigate(0);
  };

  return (
    <div className="min-h-[calc(100vh-10rem)] flex items-center justify-center px-4">
      <Result
        status="403"
        title="403"
        subTitle="Bạn không có quyền truy cập chức năng này."
        extra={[
          <Button key="retry" type="primary" onClick={handleRetry}>
            Thử lại
          </Button>,
          <Button key="home" onClick={() => navigate("/", { replace: true })}>
            Về trang chủ
          </Button>
        ]}
      />
    </div>
  );
};

export default ForbiddenPage;
