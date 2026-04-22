import React, { useEffect, useState } from "react";
import { getBookOffline, saveBookOffline } from "../lib/offline";
import { PDFViewer } from '@embedpdf/react-pdf-viewer';
import { Loader2 } from "lucide-react";

interface PdfViewerProps {
  bookUrl: string;
}

export default function PdfViewer({ bookUrl }: PdfViewerProps) {
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!bookUrl) return;

    let isMounted = true;
    const loadPdfNative = async () => {
      setLoading(true);
      setError(null);
      try {
        let blob: Blob;
        
        // 1. Try from IndexedDB
        const offlineBuffer = await getBookOffline(bookUrl);
        if (offlineBuffer) {
          blob = new Blob([offlineBuffer], { type: "application/pdf" });
        } else {
          // 2. Otherwise download
          const response = await fetch(bookUrl);
          if (!response.ok) throw new Error(`PDF 下载失败: ${response.status}`);
          const buffer = await response.arrayBuffer();
          // 3. Save to IndexedDB
          await saveBookOffline(bookUrl, buffer);
          blob = new Blob([buffer], { type: "application/pdf" });
        }

        if (!isMounted) return;

        // 4. Create an Object URL
        const url = URL.createObjectURL(blob);
        setObjectUrl(url);
        setLoading(false);
      } catch (err: any) {
        if (!isMounted) return;
        console.error("PDF Load Error:", err);
        setError(err.message || "无法加载 PDF 文件");
        setLoading(false);
      }
    };

    loadPdfNative();

    return () => {
      isMounted = false;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [bookUrl]);

  if (loading) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-[#fdfaf6]">
        <Loader2 className="w-8 h-8 animate-spin text-[#8b7e66] mb-4" />
        <p className="font-serif text-[#8b7e66]">正在准备 PDF...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full h-full flex items-center justify-center text-red-500 bg-[#fdfaf6]">
        {error}
      </div>
    );
  }

  if (!objectUrl) return null;

  return (
    <div className="w-full h-full relative" style={{ height: '100vh' }}>
      <PDFViewer
        config={{
          src: objectUrl,
          theme: { preference: 'light' }
        }}
      />
    </div>
  );
}
