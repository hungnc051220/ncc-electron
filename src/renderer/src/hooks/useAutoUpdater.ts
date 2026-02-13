import { useEffect, useRef, useState } from "react";
import { Modal, message } from "antd";
import { UpdateInfo } from "@renderer/types";

export function useAutoUpdater() {
  const [version, setVersion] = useState<string>("");
  const [progress, setProgress] = useState<number>(0);

  const popupLock = useRef<boolean>(false);

  useEffect(() => {
    window.api?.getVersion().then(setVersion);

    const onAvailable = (info: UpdateInfo) => {
      if (popupLock.current) return;

      popupLock.current = true;

      Modal.confirm({
        title: "Có phiên bản mới",
        content: `Version ${info.version}`,
        onOk: () => window.api?.startDownload(),
        onCancel: () => {
          popupLock.current = false;
        }
      });
    };

    const onProgress = (percent: number) => {
      setProgress(percent);
    };

    const onReady = () => {
      Modal.confirm({
        title: "Cập nhật sẵn sàng",
        content: "Restart để cập nhật?",
        onOk: () => window.api?.install()
      });
    };

    const onError = (msg: string) => {
      popupLock.current = false;
      message.error("Update lỗi: " + msg);
    };

    window.api?.onAvailable(onAvailable);
    window.api?.onProgress(onProgress);
    window.api?.onReady(onReady);
    window.api?.onError(onError);
  }, []);

  const manualCheck = async (): Promise<void> => {
    popupLock.current = false;

    const info = await window.api?.checkUpdate();

    if (!info) {
      message.success("Bạn đang dùng bản mới nhất");
      return;
    }
  };

  return { version, progress, manualCheck };
}
