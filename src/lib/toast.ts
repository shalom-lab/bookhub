export interface ToastMessage {
  id: string;
  type: "success" | "error" | "info";
  message: string;
}

export interface ToastEvent {
  type: "success" | "error" | "info";
  message: string;
}

const emitToast = (type: "success" | "error" | "info", message: string) => {
  const event = new CustomEvent<ToastEvent>("app-toast", {
    detail: { type, message },
  });
  document.dispatchEvent(event);
};

export const toast = {
  success: (message: string) => emitToast("success", message),
  error: (message: string) => emitToast("error", message),
  info: (message: string) => emitToast("info", message),
};
