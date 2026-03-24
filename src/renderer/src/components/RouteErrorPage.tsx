import { Button, Modal, Result, Typography } from "antd";
import { Home, RefreshCcw } from "lucide-react";
import { useMemo, useState } from "react";
import { isRouteErrorResponse, useLocation, useNavigate, useRouteError } from "react-router";

const getErrorMessage = (error: unknown) => {
  if (isRouteErrorResponse(error)) {
    return error.statusText || "Đã có lỗi xảy ra khi tải dữ liệu.";
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Đã có sự cố ngoài mong muốn. Vui lòng thử lại hoặc quay về trang chủ.";
};

const getErrorTitle = (error: unknown) => {
  if (isRouteErrorResponse(error)) {
    return `${error.status}`;
  }

  return "Có lỗi xảy ra";
};

export default function RouteErrorPage() {
  const error = useRouteError();
  const navigate = useNavigate();
  const location = useLocation();
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const errorMessage = getErrorMessage(error);
  const canGoHome = location.pathname !== "/";
  const technicalDetails = useMemo(() => {
    if (isRouteErrorResponse(error)) {
      return `${error.status} ${error.statusText}\n${error.data ? JSON.stringify(error.data, null, 2) : ""}`.trim();
    }

    if (error instanceof Error) {
      return error.stack || error.message;
    }

    return "";
  }, [error]);

  return (
    <>
      <div className="h-screen overflow-hidden bg-app-bg p-3 text-app-text sm:p-4">
        <div className="mx-auto flex h-full max-w-3xl items-center justify-center">
          <div className="w-full rounded-[28px] border border-app-border bg-app-bg-container p-5 shadow-xl shadow-slate-950/8 sm:p-8">
            <div className="flex flex-col items-center text-center">
              <Result
                status="500"
                title={getErrorTitle(error)}
                subTitle={errorMessage}
                extra={
                  <div className="flex flex-wrap items-center justify-center gap-3">
                    <Button
                      type="primary"
                      size="large"
                      icon={<RefreshCcw size={16} />}
                      onClick={() => navigate(0)}
                    >
                      Thử lại
                    </Button>
                    {canGoHome ? (
                      <Button
                        size="large"
                        icon={<Home size={16} />}
                        onClick={() => navigate("/", { replace: true })}
                      >
                        Về trang chủ
                      </Button>
                    ) : null}
                    {technicalDetails ? (
                      <Button size="large" onClick={() => setIsDetailModalOpen(true)}>
                        Chi tiết kỹ thuật
                      </Button>
                    ) : null}
                  </div>
                }
              />
            </div>
          </div>
        </div>
      </div>
      <Modal
        title="Chi tiết kỹ thuật"
        open={isDetailModalOpen}
        onCancel={() => setIsDetailModalOpen(false)}
        footer={[
          <Button key="close" onClick={() => setIsDetailModalOpen(false)}>
            Đóng
          </Button>
        ]}
        width={820}
      >
        <Typography.Paragraph className="mb-0 max-h-[55vh] overflow-auto whitespace-pre-wrap rounded-xl bg-slate-950 p-4 font-mono text-xs text-slate-100">
          {technicalDetails}
        </Typography.Paragraph>
      </Modal>
    </>
  );
}
