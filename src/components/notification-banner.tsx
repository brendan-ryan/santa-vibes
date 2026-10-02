"use client";

import { usePushPermission } from "./push-provider";

export default function NotificationBanner() {
  const { permission, requestAndSubscribe } = usePushPermission();

  if (permission !== "default") return null;

  return (
    <div className="mx-4 mt-4 rounded-xl bg-red-50 border border-red-200 px-4 py-3 flex items-center justify-between gap-3">
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
