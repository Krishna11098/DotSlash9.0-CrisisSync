"use client";

import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { getSyncStatusSnapshot, type SyncStatusSnapshot } from "@/lib/offline-sync";

type Props = {
  compact?: boolean;
};

const initialStatus: SyncStatusSnapshot = {
  isOnline: true,
  isSyncing: false,
  pendingRequestCount: 0,
  errorRequestCount: 0,
};

export default function SyncStatusIndicator({ compact = false }: Props) {
  const [status, setStatus] = useState<SyncStatusSnapshot>(initialStatus);

  const refresh = async () => {
    try {
      const snapshot = await getSyncStatusSnapshot();
      setStatus(snapshot);
    } catch (error) {
      if (typeof console !== "undefined") {
        console.warn("[sync-status] failed to refresh sync status snapshot", error);
      }
      setStatus((prev) => ({ ...prev, isOnline: typeof navigator === "undefined" ? true : navigator.onLine }));
    }
  };

  useEffect(() => {
    refresh();

    const interval = window.setInterval(refresh, 2000);
    const onOnline = () => refresh();
    const onOffline = () => refresh();

    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  const totalPending = status.pendingRequestCount;

  const view = useMemo(() => {
    if (!status.isOnline) {
      return {
        text: "Offline",
        className: "bg-slate-100 text-slate-700 border-slate-300",
      };
    }

    if (status.isSyncing) {
      return {
        text: "Syncing...",
        className: "bg-blue-100 text-blue-700 border-blue-300",
      };
    }

    if (status.errorRequestCount > 0) {
      return {
        text: `Sync Error (${status.errorRequestCount})`,
        className: "bg-red-100 text-red-700 border-red-300",
      };
    }

    if (totalPending > 0) {
      return {
        text: `Pending Sync (${totalPending})`,
        className: "bg-yellow-100 text-yellow-700 border-yellow-300",
      };
    }

    return {
      text: "Synced",
      className: "bg-green-100 text-green-700 border-green-300",
    };
  }, [status.errorRequestCount, status.isOnline, status.isSyncing, totalPending]);

  return (
    <Badge variant="outline" className={`px-3 py-1 ${view.className}`}>
      {compact ? view.text : `Sync Status: ${view.text}`}
    </Badge>
  );
}
