import { Button, Modal, Tooltip } from "antd";
import { ExclamationCircleOutlined, PoweroffOutlined } from "@ant-design/icons";
import { cn } from "@renderer/lib/utils";
import { useState } from "react";

type QuitAppProps = {
  className?: string;
  showLabel?: boolean;
};

const QuitApp = ({ className, showLabel = false }: QuitAppProps) => {
  const [open, setOpen] = useState(false);

  const handleConfirmQuit = () => {
    setOpen(false);
    window.api?.quitAppConfirmed();
  };

  const button = (
    <Button
      type="text"
      danger
      onClick={() => setOpen(true)}
      icon={<PoweroffOutlined />}
      aria-label="Tắt ứng dụng"
      className={cn("shrink-0", className)}
    >
      {showLabel ? "Tắt ứng dụng" : null}
    </Button>
  );

  return (
    <>
      {showLabel ? button : <Tooltip title="Tắt ứng dụng">{button}</Tooltip>}
      <Modal
        open={open}
        centered
        width={440}
        title={null}
        footer={null}
        closable={false}
        mask={{ blur: true, closable: false }}
        keyboard
        destroyOnHidden
        onCancel={() => setOpen(false)}
        classNames={{
          container:
            "overflow-hidden rounded-xl! border border-slate-200/80 p-0! shadow-2xl dark:border-app-border",
          body: "p-0!"
        }}
      >
        <div className="p-6">
          <div className="mx-auto flex size-12 items-center justify-center rounded-xl bg-rose-50 text-xl text-rose-600 ring-1 ring-rose-100 dark:bg-rose-500/12 dark:text-rose-300 dark:ring-rose-500/20">
            <PoweroffOutlined />
          </div>

          <div className="mt-4 text-center">
            <h2 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
              Tắt ứng dụng?
            </h2>
            <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-500 dark:text-slate-400">
              Phiên làm việc hiện tại sẽ kết thúc và tất cả cửa sổ của ứng dụng sẽ được đóng.
            </p>
          </div>

          <div className="mt-5 flex items-start gap-2.5 rounded-xl bg-amber-50 px-3.5 py-3 text-left text-amber-800 ring-1 ring-amber-200/80 dark:bg-amber-500/8 dark:text-amber-200 dark:ring-amber-500/20">
            <ExclamationCircleOutlined className="mt-0.5 shrink-0" />
            <p className="text-sm leading-5">
              Hãy hoàn tất thao tác đang thực hiện để tránh mất dữ liệu chưa lưu.
            </p>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3">
            <Button block size="large" className="rounded-xl" onClick={() => setOpen(false)}>
              Ở lại
            </Button>
            <Button
              block
              size="large"
              type="primary"
              danger
              icon={<PoweroffOutlined />}
              className="rounded-xl font-medium"
              onClick={handleConfirmQuit}
            >
              Tắt ứng dụng
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
};

export default QuitApp;
