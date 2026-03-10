import { useEffect, useState } from "react";
import { WifiOff } from "lucide-react";

const OfflineIndicator = () => {
  const [offline, setOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const goOffline = () => setOffline(true);
    const goOnline = () => setOffline(false);
    window.addEventListener("offline", goOffline);
    window.addEventListener("online", goOnline);
    return () => {
      window.removeEventListener("offline", goOffline);
      window.removeEventListener("online", goOnline);
    };
  }, []);

  if (!offline) return null;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 bg-destructive text-destructive-foreground px-4 py-2 rounded-full shadow-lg flex items-center gap-2 text-sm font-semibold animate-in fade-in slide-in-from-bottom-4">
      <WifiOff className="w-4 h-4" />
      You're offline — showing cached data
    </div>
  );
};

export default OfflineIndicator;
