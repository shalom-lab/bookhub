import { CheckCircle, AlertCircle, Info, X } from "lucide-react";
import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ToastEvent, ToastMessage } from "../lib/toast";

export default function Toast() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  useEffect(() => {
    const handleToast = (e: Event) => {
      const customEvent = e as CustomEvent<ToastEvent>;
      const { type, message } = customEvent.detail;
      const id = Date.now().toString();
      
      setToasts((prev) => [...prev, { id, type, message }]);

      // Auto dismiss after 3 seconds
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 3000);
    };

    document.addEventListener("app-toast", handleToast);
    return () => document.removeEventListener("app-toast", handleToast);
  }, []);

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-2 pointer-events-none w-full max-w-sm px-4">
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: -20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
            className={`pointer-events-auto flex items-center gap-3 p-4 rounded-xl shadow-lg border backdrop-blur-md ${
              toast.type === "success"
                ? "bg-green-50/90 border-green-200 text-green-700"
                : toast.type === "error"
                ? "bg-red-50/90 border-red-200 text-red-700"
                : "bg-blue-50/90 border-blue-200 text-blue-700"
            }`}
          >
            <div className="shrink-0">
              {toast.type === "success" && <CheckCircle className="w-5 h-5" />}
              {toast.type === "error" && <AlertCircle className="w-5 h-5" />}
              {toast.type === "info" && <Info className="w-5 h-5" />}
            </div>
            <p className="flex-1 text-sm font-medium">{toast.message}</p>
            <button
              onClick={() => removeToast(toast.id)}
              className="p-1 hover:bg-black/5 rounded-full transition-colors shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
