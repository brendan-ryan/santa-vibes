"use client";

import { useEffect, useState } from "react";
import { usePushPermission } from "./push-provider";

function useIOSInstallPrompt() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      ("standalone" in navigator && (navigator as { standalone?: boolean }).standalone === true);
    const noNotificationAPI = !("Notification" in window);
    setShow(isIOS && !isStandalone && noNotificationAPI);
  }, []);

  return show;
}

export default function NotificationBanner() {
  const { permission, requestAndSubscribe } = usePushPermission();
  const showIOSPrompt = useIOSInstallPrompt();

  if (showIOSPrompt) {
    return (
      <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3">
        <p className="text-sm font-medium text-red-800">Get notified about messages</p>
        <p className="text-xs text-red-600 mt-0.5">
          Tap the share button{" "}
          <span className="font-semibold">⎋</span> then{" "}
          <span className="font-semibold">Add to Home Screen</span> to enable push notifications.
        </p>
      </div>
    );
  }

  if (permission !== "default") return null;

  return (
    <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 flex items-center justify-between gap-3">
      <div>
        <p className="text-sm font-medium text-red-800">Get notified about new messages</p>
        <p className="text-xs text-red-600 mt-0.5">Enable notifications to know when your Santa or person replies.</p>
      </div>
      <button
        onClick={requestAndSubscribe}
        className="flex-shrink-0 px-3 py-1.5 bg-red-700 text-white text-xs font-semibold rounded-lg hover:bg-red-800 transition-colors"
      >
        Enable
      </button>
    </div>
  );
}
