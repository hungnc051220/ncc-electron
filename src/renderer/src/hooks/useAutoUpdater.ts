import { createElement, useCallback, useEffect, useRef, useState } from "react";
import { ReloadOutlined } from "@ant-design/icons";
import { UpdateDownloadProgress, UpdateInfo, UpdateMode, UpdatePolicy } from "@shared/types";
import VersionInfoModalContent from "@renderer/components/VersionInfoModalContent";
import UpdateProgressNotification from "@renderer/components/UpdateProgressNotification";
import UpdateProgressDock from "@renderer/components/UpdateProgressDock";
import { useAntdApp } from "@renderer/hooks/useAntdApp";

const UPDATE_PROGRESS_NOTIFICATION_KEY = "update-progress-notification";
const UPDATE_PROGRESS_DOCK_KEY = "update-progress-dock";
const INITIAL_PROGRESS: UpdateDownloadProgress = {
  percent: 0,
  transferred: 0,
  total: 0,
  bytesPerSecond: 0
};
const DEFAULT_UPDATE_MODE: UpdateMode = "optional";

export function useAutoUpdater() {
  const { modal, message, notification } = useAntdApp();
  const [version, setVersion] = useState<string>("");
  const [progress, setProgress] = useState<number>(0);
  const [availableUpdate, setAvailableUpdate] = useState<UpdateInfo | null>(null);
  const [policy, setPolicy] = useState<UpdatePolicy | null>(null);
  const [isDownloading, setIsDownloading] = useState<boolean>(false);

  const modalRef = useRef<{
    destroy: () => void;
    update: (configUpdate: Record<string, unknown>) => void;
  } | null>(null);
  const hiddenProgressRef = useRef<boolean>(false);
  const latestUpdateRef = useRef<UpdateInfo | null>(null);
  const latestPolicyRef = useRef<UpdatePolicy | null>(null);
  const latestModeRef = useRef<UpdateMode>(DEFAULT_UPDATE_MODE);
  const versionRef = useRef<string>("");
  const latestProgressRef = useRef<UpdateDownloadProgress>(INITIAL_PROGRESS);
  const isDownloadingRef = useRef<boolean>(false);
  const openProgressDockRef = useRef<() => void>(() => undefined);
  const openProgressNotificationRef = useRef<(progressInfo: UpdateDownloadProgress) => void>(
    () => undefined
  );

  const ensureVersion = useCallback(async (): Promise<string> => {
    if (versionRef.current) {
      return versionRef.current;
    }

    const currentVersion = (await window.api?.getVersion()) ?? "";

    versionRef.current = currentVersion;
    setVersion(currentVersion);

    return currentVersion;
  }, []);

  const setLatestPolicy = useCallback((nextPolicy: UpdatePolicy | null) => {
    latestPolicyRef.current = nextPolicy;
    latestModeRef.current = nextPolicy?.mode ?? DEFAULT_UPDATE_MODE;
    setPolicy(nextPolicy);
  }, []);

  const getEffectiveMode = useCallback((info?: UpdateInfo | null): UpdateMode => {
    const mode = info?.mode ?? latestPolicyRef.current?.mode ?? latestModeRef.current;
    const latestVersion = info?.version ?? latestPolicyRef.current?.latestVersion;

    if (
      mode === "force" &&
      versionRef.current &&
      latestVersion &&
      latestVersion === versionRef.current
    ) {
      return DEFAULT_UPDATE_MODE;
    }

    return mode;
  }, []);

  const closeVersionModal = useCallback(() => {
    if (latestModeRef.current === "force") {
      return;
    }

    modalRef.current?.destroy();
    modalRef.current = null;
  }, []);

  const closeProgressDock = useCallback(() => {
    notification.destroy(UPDATE_PROGRESS_DOCK_KEY);
  }, [notification]);

  const openProgressDock = useCallback(() => {
    notification.open({
      key: UPDATE_PROGRESS_DOCK_KEY,
      placement: "bottomRight",
      duration: 0,
      className: "update-progress-dock-notice",
      message: null,
      description: createElement(UpdateProgressDock, {
        percent: latestProgressRef.current.percent,
        latestVersion: latestUpdateRef.current?.version,
        onExpand: () => {
          hiddenProgressRef.current = false;
          closeProgressDock();
          openProgressNotificationRef.current(latestProgressRef.current);
        }
      }),
      closeIcon: false
    });
  }, [closeProgressDock, notification]);

  const openProgressNotification = useCallback(
    (progressInfo: UpdateDownloadProgress) => {
      latestProgressRef.current = progressInfo;

      if (hiddenProgressRef.current) {
        openProgressDockRef.current();
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
          onHide: () => {
            hiddenProgressRef.current = true;
            notification.destroy(UPDATE_PROGRESS_NOTIFICATION_KEY);
            openProgressDockRef.current();
          }
        }),
        closeIcon: false
      });
    },
    [closeProgressDock, notification]
  );

  useEffect(() => {
    openProgressDockRef.current = openProgressDock;
  }, [openProgressDock]);

  useEffect(() => {
    openProgressNotificationRef.current = openProgressNotification;
  }, [openProgressNotification]);

  const beginDownload = useCallback(
    async (mode: UpdateMode = latestModeRef.current) => {
      if (isDownloadingRef.current) {
        return;
      }

      hiddenProgressRef.current = false;
      if (mode !== "force") {
        closeVersionModal();
      }
      setIsDownloading(true);
      isDownloadingRef.current = true;
      closeProgressDock();
      openProgressNotification(INITIAL_PROGRESS);
      await window.api?.startDownload();
    },
    [closeProgressDock, closeVersionModal, openProgressNotification]
  );

  const openVersionInfoModal = useCallback(
    async (nextUpdate: UpdateInfo | null) => {
      const currentVersion = await ensureVersion();
      const updateMode = getEffectiveMode(nextUpdate);
      const hasUpdate = Boolean(nextUpdate?.version && nextUpdate.version !== currentVersion);
      const isForceUpdate = updateMode === "force" && hasUpdate;

      if (!isForceUpdate) {
        modalRef.current?.destroy();
      }

      modalRef.current = modal.info({
        title: null,
        icon: null,
        footer: null,
        width: 560,
        className: "version-info-modal",
        rootClassName: "version-info-modal-root",
        centered: true,
        closable: false,
        keyboard: !isForceUpdate,
        mask: { closable: !isForceUpdate },
        styles: {
          body: {
            padding: 0
          }
        },
        content: createElement(VersionInfoModalContent, {
          currentVersion: currentVersion,
          latestVersion: nextUpdate?.version,
          updateMode,
          messages: nextUpdate?.messages ?? latestPolicyRef.current?.messages,
          isDownloading,
          onClose: closeVersionModal,
          onQuitApp: () => window.api?.quitApp(),
          onUpdateNow: () => {
            void beginDownload(updateMode);
          }
        })
      });
    },
    [beginDownload, closeVersionModal, ensureVersion, getEffectiveMode, isDownloading, modal]
  );

  useEffect(() => {
    void ensureVersion();
    void window.api?.getUpdatePolicy().then(setLatestPolicy);

    const onAvailable = async (info: UpdateInfo) => {
      latestUpdateRef.current = info;
      setAvailableUpdate(info);
      if (info.policy) {
        setLatestPolicy(info.policy);
      }

      const mode = getEffectiveMode(info);

      if (mode === "silent") {
        await beginDownload(mode);
        return;
      }

      await openVersionInfoModal(info);

      if (mode === "force") {
        await beginDownload(mode);
      }
    };

    const onUpdatePolicy = (nextPolicy: UpdatePolicy) => {
      setLatestPolicy(nextPolicy);
    };

    const onProgress = (progressInfo: UpdateDownloadProgress) => {
      setProgress(progressInfo.percent);
      setIsDownloading(true);
      isDownloadingRef.current = true;
      openProgressNotification(progressInfo);
    };

    const onReady = (readyInfo?: { mode?: UpdateMode; policy?: UpdatePolicy }) => {
      if (readyInfo?.policy) {
        setLatestPolicy(readyInfo.policy);
      }

      const mode = readyInfo?.mode ?? latestModeRef.current;
      const isForceUpdate = mode === "force";

      setIsDownloading(false);
      isDownloadingRef.current = false;
      setProgress(100);
      hiddenProgressRef.current = false;
      notification.destroy(UPDATE_PROGRESS_NOTIFICATION_KEY);
      closeProgressDock();
      modal.confirm({
        title: isForceUpdate ? "Cập nhật bắt buộc đã sẵn sàng" : "Bản cập nhật đã sẵn sàng",
        content: isForceUpdate
          ? "Ứng dụng cần khởi động lại để hoàn tất cài đặt phiên bản mới. Bạn có thể khởi động lại ngay hoặc thoát chương trình."
          : "Tải xuống hoàn tất. Khởi động lại ứng dụng để cài đặt phiên bản mới?",
        okText: "Khởi động lại ngay",
        cancelText: isForceUpdate ? "Thoát chương trình" : "Để sau",
        closable: !isForceUpdate,
        keyboard: !isForceUpdate,
        mask: { closable: !isForceUpdate },
        cancelButtonProps: isForceUpdate
          ? {
              danger: true
            }
          : undefined,
        okButtonProps: {
          icon: createElement(ReloadOutlined)
        },
        onOk: () => window.api?.install({ isSilent: mode === "silent" }),
        onCancel: isForceUpdate ? () => window.api?.quitApp() : undefined
      });
    };

    const onError = (msg: string) => {
      setIsDownloading(false);
      isDownloadingRef.current = false;
      hiddenProgressRef.current = false;
      notification.destroy(UPDATE_PROGRESS_NOTIFICATION_KEY);
      closeProgressDock();
      message.error("Lỗi cập nhật: " + msg);
    };

    const unsubAvailable = window.api?.onAvailable(onAvailable);
    const unsubPolicy = window.api?.onUpdatePolicy(onUpdatePolicy);
    const unsubProgress = window.api?.onProgress(onProgress);
    const unsubReady = window.api?.onReady(onReady);
    const unsubError = window.api?.onError(onError);

    return () => {
      unsubAvailable?.();
      unsubPolicy?.();
      unsubProgress?.();
      unsubReady?.();
      unsubError?.();
    };
  }, [
    closeProgressDock,
    beginDownload,
    ensureVersion,
    getEffectiveMode,
    message,
    modal,
    notification,
    openProgressNotification,
    openVersionInfoModal,
    setLatestPolicy
  ]);

  const manualCheck = async (): Promise<void> => {
    const info = await window.api?.checkUpdate();
    latestUpdateRef.current = info ?? null;
    setAvailableUpdate(info ?? null);
    if (info?.policy) {
      setLatestPolicy(info.policy);
    }

    if (!info) {
      setProgress(0);
    }
  };

  const showVersionInfo = async (): Promise<void> => {
    await manualCheck();
    await openVersionInfoModal(latestUpdateRef.current ?? availableUpdate);
  };

  return { version, progress, policy, manualCheck, showVersionInfo };
}
