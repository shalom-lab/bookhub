import React, { useEffect, useState } from "react";
import { getBookOffline, saveBookOffline } from "../lib/offline";
import { Loader2, X } from "lucide-react";

interface PdfViewerProps {
  bookUrl: string;
  onLoading: (loading: boolean) => void;
  onError: (error: string | null) => void;
}

export default function PdfViewer({
  bookUrl,
  onLoading,
  onError
}: PdfViewerProps) {
  const [objectUrl, setObjectUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!bookUrl) return;

    const loadPdfNative = async () => {
      onLoading(true);
      onError(null);
      try {
        let blob: Blob;
        
        // 1. 尝试从本地离线存储读取
        const offlineBuffer = await getBookOffline(bookUrl);
        if (offlineBuffer) {
          blob = new Blob([offlineBuffer], { type: "application/pdf" });
        } else {
          // 2. 否则从网络下载
          const response = await fetch(bookUrl);
          if (!response.ok) throw new Error(`PDF 下载失败: ${response.status}`);
          const buffer = await response.arrayBuffer();
          // 3. 保存到离线存储
          await saveBookOffline(bookUrl, buffer);
          blob = new Blob([buffer], { type: "application/pdf" });
        }

        // 4. 创建一个指向 PDF 数据的 Object URL
        const url = URL.createObjectURL(blob);
        setObjectUrl(url);
        onLoading(false);
      } catch (err: any) {
        console.error("Native PDF Load Error:", err);
        onError(err.message || "无法加载 PDF 文件");
        onLoading(false);
      }
    };

    loadPdfNative();

    // 清理函数：释放内存
    return () => {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [bookUrl]);

  if (!objectUrl) return null;

  return (
    <div className="w-full h-full bg-[#323639]">
      <iframe
        src={`${objectUrl}#toolbar=1&view=FitH`}
        className="w-full h-full border-none shadow-inner"
        title="PDF Reader"
      />
    </div>
  );
}
