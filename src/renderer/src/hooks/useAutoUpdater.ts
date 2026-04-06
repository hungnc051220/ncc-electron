import { createElement, useEffect, useRef, useState } from "react";
import { App } from "antd";
import { ReloadOutlined } from "@ant-design/icons";
import { UpdateDownloadProgress, UpdateInfo } from "@shared/types";
import VersionInfoModalContent from "@renderer/components/VersionInfoModalContent";
import UpdateProgressNotification from "@renderer/components/UpdateProgressNotification";
import UpdateProgressDock from "@renderer/components/UpdateProgressDock";

const UPDATE_PROGRESS_NOTIFICATION_KEY = "update-progress-notification";
const UPDATE_PROGRESS_DOCK_KEY = "update-progress-dock";
const ENABLE_MOCK_UPDATE_CONTROLS = process.env.APP_MOCK_UPDATE_PROGRESS === "true";
const INITIAL_PROGRESS: UpdateDownloadProgress = {
  percent: 0,
  transferred: 0,
  total: 0,
  bytesPerSecond: 0
};

export function useAutoUpdater() {
  const { modal, message, notification } = App.useApp();
  const [version, setVersion] = useState<string>("");
  const [progress, setProgress] = useState<number>(0);
  const [availableUpdate, setAvailableUpdate] = useState<UpdateInfo | null>(null);
  const [isDownloading, setIsDownloading] = useState<boolean>(false);
  const [isMockDownloadPaused, setIsMockDownloadPaused] = useState<boolean>(false);

  const modalRef = useRef<{
    destroy: () => void;
    update: (configUpdate: Record<string, unknown>) => void;
  } | null>(null);
  const hiddenProgressRef = useRef<boolean>(false);
  const latestUpdateRef = useRef<UpdateInfo | null>(null);
  const versionRef = useRef<string>("");
  const latestProgressRef = useRef<UpdateDownloadProgress>(INITIAL_PROGRESS);
  const isMockDownloadPausedRef = useRef<boolean>(false);
  const isDownloadingRef = useRef<boolean>(false);

  const ensureVersion = async (): Promise<string> => {
    if (versionRef.current) {
      return versionRef.current;
    }

    const currentVersion = (await window.api?.getVersion()) ?? "";

    versionRef.current = currentVersion;
    setVersion(currentVersion);

    return currentVersion;
  };

  const closeVersionModal = () => {
    modalRef.current?.destroy();
    modalRef.current = null;
  };

  const toggleMockDownloadPause = async () => {
    if (!ENABLE_MOCK_UPDATE_CONTROLS || !isDownloadingRef.current) {
      return;
    }

    if (isMockDownloadPausedRef.current) {
      await window.api?.resumeMockUpdateDownload();
      isMockDownloadPausedRef.current = false;
      setIsMockDownloadPaused(false);
    } else {
      await window.api?.pauseMockUpdateDownload();
      isMockDownloadPausedRef.current = true;
      setIsMockDownloadPaused(true);
    }

    if (hiddenProgressRef.current) {
      openProgressDock();
      return;
    }

    openProgressNotification(latestProgressRef.current);
  };

  const closeProgressDock = () => {
    notification.destroy(UPDATE_PROGRESS_DOCK_KEY);
  };

  const openProgressDock = () => {
    notification.open({
      key: UPDATE_PROGRESS_DOCK_KEY,
      placement: "bottomRight",
      duration: 0,
      className: "update-progress-dock-notice",
      message: null,
      description: createElement(UpdateProgressDock, {
        percent: latestProgressRef.current.percent,
        latestVersion: latestUpdateRef.current?.version,
        isPaused: isMockDownloadPausedRef.current,
        onTogglePause: () => {
          void toggleMockDownloadPause();
        },
        showMockControls: ENABLE_MOCK_UPDATE_CONTROLS,
        onExpand: () => {
          hiddenProgressRef.current = false;
          closeProgressDock();
          openProgressNotification(latestProgressRef.current);
        }
      }),
      closeIcon: false
    });
  };

  const openProgressNotification = (progressInfo: UpdateDownloadProgress) => {
    latestProgressRef.current = progressInfo;

    if (hiddenProgressRef.current) {
      openProgressDock();
      return;
    }

    closeProgressDock();

    notification.open({
      key: UPDATE_PROGRESS_NOTIFICATION_KEY,
      placement: "bottomRight",
      duration: 0,
      className: "update-progress-notice",
      message: null,
      description: createElement(UpdateProgressNotification, {
        progress: progressInfo,
        latestVersion: latestUpdateRef.current?.version,
        isPaused: isMockDownloadPausedRef.current,
        onTogglePause: () => {
          void toggleMockDownloadPause();
        },
        showMockControls: ENABLE_MOCK_UPDATE_CONTROLS,
        onHide: () => {
          hiddenProgressRef.current = true;
          notification.destroy(UPDATE_PROGRESS_NOTIFICATION_KEY);
          openProgressDock();
        }
      }),
      closeIcon: false
    });
  };

  const beginDownload = async () => {
    hiddenProgressRef.current = false;
    closeVersionModal();
    setIsDownloading(true);
    isDownloadingRef.current = true;
    isMockDownloadPausedRef.current = false;
    setIsMockDownloadPaused(false);
    closeProgressDock();
    openProgressNotification(INITIAL_PROGRESS);
    await window.api?.startDownload();
  };

  const openVersionInfoModal = async (nextUpdate: UpdateInfo | null) => {
    const currentVersion = await ensureVersion();

    modalRef.current?.destroy();

    modalRef.current = modal.info({
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
        currentVersion: currentVersion,
        latestVersion: nextUpdate?.version,
        isDownloading,
        onClose: closeVersionModal,
        onUpdateNow: beginDownload
      })
    });
  };

  useEffect(() => {
    void ensureVersion();

    const onAvailable = async (info: UpdateInfo) => {
      latestUpdateRef.current = info;
      setAvailableUpdate(info);
      await openVersionInfoModal(info);
    };

    const onProgress = (progressInfo: UpdateDownloadProgress) => {
      setProgress(progressInfo.percent);
      setIsDownloading(true);
      isDownloadingRef.current = true;
      isMockDownloadPausedRef.current = false;
      setIsMockDownloadPaused(false);
      openProgressNotification(progressInfo);
    };

    const onReady = () => {
      setIsDownloading(false);
      isDownloadingRef.current = false;
      isMockDownloadPausedRef.current = false;
      setIsMockDownloadPaused(false);
      setProgress(100);
      hiddenProgressRef.current = false;
      notification.destroy(UPDATE_PROGRESS_NOTIFICATION_KEY);
      closeProgressDock();
      modal.confirm({
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
      isDownloadingRef.current = false;
      isMockDownloadPausedRef.current = false;
      setIsMockDownloadPaused(false);
      hiddenProgressRef.current = false;
      notification.destroy(UPDATE_PROGRESS_NOTIFICATION_KEY);
      closeProgressDock();
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
    await openVersionInfoModal(latestUpdateRef.current ?? availableUpdate);
  };

  return { version, progress, manualCheck, showVersionInfo, toggleMockDownloadPause };
}
