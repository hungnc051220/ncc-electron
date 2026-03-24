import { createElement, useEffect, useRef, useState } from "react";
import { Modal, message, notification } from "antd";
import { ReloadOutlined } from "@ant-design/icons";
import { UpdateDownloadProgress, UpdateInfo } from "@shared/types";
import VersionInfoModalContent from "@renderer/components/VersionInfoModalContent";
import UpdateProgressNotification from "@renderer/components/UpdateProgressNotification";

const UPDATE_PROGRESS_NOTIFICATION_KEY = "update-progress-notification";
const INITIAL_PROGRESS: UpdateDownloadProgress = {
  percent: 0,
  transferred: 0,
  total: 0,
  bytesPerSecond: 0
};

export function useAutoUpdater() {
  const [version, setVersion] = useState<string>("");
  const [progress, setProgress] = useState<number>(0);
  const [availableUpdate, setAvailableUpdate] = useState<UpdateInfo | null>(null);
  const [isDownloading, setIsDownloading] = useState<boolean>(false);

  const modalRef = useRef<{
    destroy: () => void;
    update: (configUpdate: Record<string, unknown>) => void;
  } | null>(null);
  const hiddenProgressRef = useRef<boolean>(false);
  const latestUpdateRef = useRef<UpdateInfo | null>(null);

  const closeVersionModal = () => {
    modalRef.current?.destroy();
    modalRef.current = null;
  };

  const openProgressNotification = (progressInfo: UpdateDownloadProgress) => {
    if (hiddenProgressRef.current) {
      return;
    }

    notification.open({
      key: UPDATE_PROGRESS_NOTIFICATION_KEY,
      placement: "bottomRight",
      duration: 0,
      message: null,
      description: createElement(UpdateProgressNotification, {
        progress: progressInfo,
        latestVersion: latestUpdateRef.current?.version,
        onHide: () => {
          hiddenProgressRef.current = true;
          notification.destroy(UPDATE_PROGRESS_NOTIFICATION_KEY);
        }
      }),
      closeIcon: false
    });
  };

  const beginDownload = async () => {
    hiddenProgressRef.current = false;
    closeVersionModal();
    setIsDownloading(true);
    openProgressNotification(INITIAL_PROGRESS);
    await window.api?.startDownload();
  };

  const openVersionInfoModal = (nextUpdate: UpdateInfo | null) => {
    modalRef.current?.destroy();

    modalRef.current = Modal.info({
      title: null,
      icon: null,
      footer: null,
      width: 560,
      className: "version-info-modal",
      styles: {
        body: {
          padding: 0
        }
      },
      content: createElement(VersionInfoModalContent, {
        currentVersion: version,
        latestVersion: nextUpdate?.version,
        isDownloading,
        onClose: closeVersionModal,
        onUpdateNow: beginDownload
      })
    });
  };

  useEffect(() => {
    window.api?.getVersion().then(setVersion);

    const onAvailable = (info: UpdateInfo) => {
      latestUpdateRef.current = info;
      setAvailableUpdate(info);
    };

    const onProgress = (progressInfo: UpdateDownloadProgress) => {
      setProgress(progressInfo.percent);
      setIsDownloading(true);
      openProgressNotification(progressInfo);
    };

    const onReady = () => {
      setIsDownloading(false);
      setProgress(100);
      hiddenProgressRef.current = false;
      notification.destroy(UPDATE_PROGRESS_NOTIFICATION_KEY);
      Modal.confirm({
        title: "Bản cập nhật đã sẵn sàng",
        content: "Tải xuống hoàn tất. Khởi động lại ứng dụng để cài đặt phiên bản mới?",
        okText: "Khởi động lại ngay",
        cancelText: "Để sau",
        okButtonProps: {
          icon: createElement(ReloadOutlined)
        },
        onOk: () => window.api?.install()
      });
    };

    const onError = (msg: string) => {
      setIsDownloading(false);
      hiddenProgressRef.current = false;
      notification.destroy(UPDATE_PROGRESS_NOTIFICATION_KEY);
      message.error("Update lỗi: " + msg);
    };

    const unsubAvailable = window.api?.onAvailable(onAvailable);
    const unsubProgress = window.api?.onProgress(onProgress);
    const unsubReady = window.api?.onReady(onReady);
    const unsubError = window.api?.onError(onError);

    return () => {
      unsubAvailable?.();
      unsubProgress?.();
      unsubReady?.();
      unsubError?.();
    };
  }, []);

  const manualCheck = async (): Promise<void> => {
    const info = await window.api?.checkUpdate();
    latestUpdateRef.current = info ?? null;
    setAvailableUpdate(info ?? null);

    if (!info) {
      setProgress(0);
    }
  };

  const showVersionInfo = async (): Promise<void> => {
    await manualCheck();
    openVersionInfoModal(latestUpdateRef.current ?? availableUpdate);
  };

  return { version, progress, manualCheck, showVersionInfo };
}
