import { createElement, useCallback, useEffect, useRef, useState } from "react";
import { ReloadOutlined } from "@ant-design/icons";
import {
  UpdateCheckResult,
  UpdateDownloadProgress,
  UpdateErrorPayload,
  UpdateInfo,
  UpdateMode,
  UpdatePolicy
} from "@shared/types";
import VersionInfoModalContent from "@renderer/components/VersionInfoModalContent";
import UpdateProgressNotification from "@renderer/components/UpdateProgressNotification";
import UpdateProgressDock from "@renderer/components/UpdateProgressDock";
import UpdateErrorNotificationActions from "@renderer/components/UpdateErrorNotificationActions";
import { useAntdApp } from "@renderer/hooks/useAntdApp";
import { getUpdateErrorContent, normalizeUpdateErrorPayload } from "@renderer/lib/updateError";

const UPDATE_PROGRESS_NOTIFICATION_KEY = "update-progress-notification";
const UPDATE_PROGRESS_DOCK_KEY = "update-progress-dock";
const UPDATE_ERROR_NOTIFICATION_KEY = "update-error-notification";
/** Bỏ qua lỗi trùng (cùng bước + mã) trong khoảng này để không spam khi mất mạng. */
export const UPDATE_ERROR_DEDUPE_MS = 10_000;
const UPDATE_ERROR_DURATION_SECONDS = 8;
const INITIAL_PROGRESS: UpdateDownloadProgress = {
  percent: 0,
  transferred: 0,
  total: 0,
  bytesPerSecond: 0
};
const DEFAULT_UPDATE_MODE: UpdateMode = "optional";

/** Policy `enabled=false`: không mời, không tải, không cài bản mới từ UI. */
const isUpdatePaused = (policy?: UpdatePolicy | null) => policy?.enabled === false;

export function useAutoUpdater() {
  const { modal, notification } = useAntdApp();
  const [version, setVersion] = useState<string>("");
  const [progress, setProgress] = useState<number>(0);
  const [availableUpdate, setAvailableUpdate] = useState<UpdateInfo | null>(null);
  const [policy, setPolicy] = useState<UpdatePolicy | null>(null);
  const [isDownloading, setIsDownloading] = useState<boolean>(false);

  const modalRef = useRef<{
    destroy: () => void;
    update: (configUpdate: Record<string, unknown>) => void;
  } | null>(null);
  const hiddenProgressRef = useRef<boolean>(true);
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
  const handleUpdateErrorRef = useRef<(payload: UpdateErrorPayload) => void>(() => undefined);
  const showVersionInfoRef = useRef<() => Promise<void>>(async () => undefined);
  const lastUpdateErrorRef = useRef<{ signature: string; at: number } | null>(null);

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
    // Policy tạm dừng cập nhật thì không bao giờ khóa màn hình theo mode force.
    latestModeRef.current =
      nextPolicy?.enabled === false
        ? DEFAULT_UPDATE_MODE
        : (nextPolicy?.mode ?? DEFAULT_UPDATE_MODE);
    setPolicy(nextPolicy);
  }, []);

  const getEffectiveMode = useCallback((info?: UpdateInfo | null): UpdateMode => {
    if (isUpdatePaused(latestPolicyRef.current)) {
      return DEFAULT_UPDATE_MODE;
    }

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

  const getEffectiveLatestVersion = useCallback((info?: UpdateInfo | null): string | null => {
    if (isUpdatePaused(latestPolicyRef.current)) {
      return null;
    }

    return info?.version ?? latestPolicyRef.current?.latestVersion ?? null;
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

  const resetDownloadState = useCallback(() => {
    setIsDownloading(false);
    setProgress(0);
    isDownloadingRef.current = false;
    hiddenProgressRef.current = true;
    latestProgressRef.current = INITIAL_PROGRESS;
    notification.destroy(UPDATE_PROGRESS_NOTIFICATION_KEY);
    closeProgressDock();
  }, [closeProgressDock, notification]);

  const showUpdateError = useCallback(
    (payload: UpdateErrorPayload, onRetry?: () => void) => {
      const signature = `${payload.stage}:${payload.code}`;
      const now = Date.now();
      const lastError = lastUpdateErrorRef.current;

      if (lastError?.signature === signature && now - lastError.at < UPDATE_ERROR_DEDUPE_MS) {
        return;
      }

      lastUpdateErrorRef.current = { signature, at: now };

      const content = getUpdateErrorContent(payload);
      const close = () => notification.destroy(UPDATE_ERROR_NOTIFICATION_KEY);
      const retry = onRetry
        ? () => {
            close();
            lastUpdateErrorRef.current = null;
            onRetry();
          }
        : undefined;

      notification[content.severity]({
        key: UPDATE_ERROR_NOTIFICATION_KEY,
        placement: "bottomRight",
        duration: latestModeRef.current === "force" ? 0 : UPDATE_ERROR_DURATION_SECONDS,
        title: content.title,
        description: content.description,
        actions: createElement(UpdateErrorNotificationActions, { onRetry: retry, onClose: close })
      });
    },
    [notification]
  );

  const beginDownload = useCallback(
    async (mode: UpdateMode = latestModeRef.current) => {
      if (isDownloadingRef.current || isUpdatePaused(latestPolicyRef.current)) {
        return;
      }

      hiddenProgressRef.current = true;
      if (mode !== "force") {
        closeVersionModal();
      }
      setIsDownloading(true);
      isDownloadingRef.current = true;
      closeProgressDock();
      openProgressNotification(INITIAL_PROGRESS);

      try {
        await window.api?.startDownload();
      } catch {
        handleUpdateErrorRef.current({
          code: "UPDATE_UNKNOWN",
          stage: "download",
          retryable: true
        });
      }
    },
    [closeProgressDock, closeVersionModal, openProgressNotification]
  );

  const openVersionInfoModal = useCallback(
    async (nextUpdate: UpdateInfo | null) => {
      const currentVersion = await ensureVersion();
      const updateMode = getEffectiveMode(nextUpdate);
      const latestVersion = getEffectiveLatestVersion(nextUpdate);
      const hasUpdate = Boolean(latestVersion && latestVersion !== currentVersion);
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
          latestVersion,
          updateMode,
          messages: latestPolicyRef.current?.messages ?? nextUpdate?.messages,
          isDownloading,
          onClose: closeVersionModal,
          onQuitApp: () => window.api?.quitApp(),
          onUpdateNow: () => {
            void beginDownload(updateMode);
          }
        })
      });
    },
    [
      beginDownload,
      closeVersionModal,
      ensureVersion,
      getEffectiveLatestVersion,
      getEffectiveMode,
      isDownloading,
      modal
    ]
  );

  const updateVersionInfoModal = useCallback(
    async (nextUpdate: UpdateInfo | null) => {
      if (!modalRef.current) {
        return;
      }

      const currentVersion = await ensureVersion();
      const updateMode = getEffectiveMode(nextUpdate);
      const latestVersion = getEffectiveLatestVersion(nextUpdate);

      modalRef.current.update({
        keyboard: updateMode !== "force",
        mask: { closable: updateMode !== "force" },
        content: createElement(VersionInfoModalContent, {
          currentVersion,
          latestVersion,
          updateMode,
          messages: latestPolicyRef.current?.messages ?? nextUpdate?.messages,
          isDownloading: isDownloadingRef.current,
          onClose: closeVersionModal,
          onQuitApp: () => window.api?.quitApp(),
          onUpdateNow: () => {
            void beginDownload(updateMode);
          }
        })
      });
    },
    [beginDownload, closeVersionModal, ensureVersion, getEffectiveLatestVersion, getEffectiveMode]
  );

  useEffect(() => {
    void ensureVersion();
    void window.api?.getUpdatePolicy().then(setLatestPolicy);

    const onAvailable = async (info: UpdateInfo) => {
      if (isUpdatePaused(info.policy ?? latestPolicyRef.current)) {
        return;
      }

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
      void updateVersionInfoModal(latestUpdateRef.current);
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
      hiddenProgressRef.current = true;
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

    const getRetryAction = (payload: UpdateErrorPayload) => {
      if (!payload.retryable) return undefined;
      if (payload.stage === "check") return () => void showVersionInfoRef.current();
      if (payload.stage === "download") {
        return () => void beginDownload(getEffectiveMode(latestUpdateRef.current));
      }

      return undefined;
    };

    const onError = (rawPayload: unknown) => {
      const payload = normalizeUpdateErrorPayload(rawPayload);

      // Lỗi kiểm tra không được làm mất tiến trình của lượt tải đang chạy (nếu có).
      if (payload.stage !== "check") {
        resetDownloadState();
        void updateVersionInfoModal(latestUpdateRef.current);
      }

      showUpdateError(payload, getRetryAction(payload));
    };

    handleUpdateErrorRef.current = onError;

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
    modal,
    notification,
    openProgressNotification,
    openVersionInfoModal,
    resetDownloadState,
    setLatestPolicy,
    showUpdateError,
    updateVersionInfoModal
  ]);

  const runManualCheck = async (): Promise<UpdateCheckResult> => {
    let result: UpdateCheckResult;

    try {
      result = (await window.api?.checkUpdate()) ?? { status: "checked", info: null };
    } catch {
      result = {
        status: "failed",
        error: { code: "UPDATE_UNKNOWN", stage: "check", retryable: true }
      };
      handleUpdateErrorRef.current(result.error);
    }

    if (result.status === "failed") {
      return result;
    }

    const info = result.status === "checked" ? result.info : null;
    latestUpdateRef.current = info;
    setAvailableUpdate(info);
    if (info?.policy) {
      setLatestPolicy(info.policy);
    }

    if (!info && !isDownloadingRef.current) {
      setProgress(0);
    }

    return result;
  };

  const manualCheck = async (): Promise<void> => {
    await runManualCheck();
  };

  const showVersionInfo = async (): Promise<void> => {
    const result = await runManualCheck();

    // Lỗi đã được báo bằng thông báo ngắn; không mở modal với thông tin phiên bản cũ.
    if (result.status === "failed") {
      return;
    }

    const fallbackUpdate = result.status === "disabled" ? null : availableUpdate;
    await openVersionInfoModal(latestUpdateRef.current ?? fallbackUpdate);
  };

  showVersionInfoRef.current = showVersionInfo;

  return { version, progress, policy, manualCheck, showVersionInfo };
}
