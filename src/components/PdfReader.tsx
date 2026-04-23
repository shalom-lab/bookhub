import React, { useEffect, useState } from "react";
import { PDFViewer, ScrollStrategy } from '@embedpdf/react-pdf-viewer';
import { getBookOffline, saveBookOffline } from "../lib/offline";
import { Loader2 } from "lucide-react";

interface PdfReaderProps {
  bookUrl: string;
}

export default function PdfReader({ bookUrl }: PdfReaderProps) {
  const [loading, setLoading] = useState(true);
  const [pdfData, setPdfData] = useState<string | Uint8Array | null>(null);

  useEffect(() => {
    const loadPdf = async () => {
      setLoading(true);
      try {
        // 1. 尝试从本地 IndexedDB 获取
        const offlineBuffer = await getBookOffline(bookUrl);
        if (offlineBuffer) {
          setPdfData(new Uint8Array(offlineBuffer as ArrayBuffer));
        } else {
          // 2. 本地没有，则下载并存入本地
          const response = await fetch(bookUrl);
          const buffer = await response.arrayBuffer();
          await saveBookOffline(bookUrl, buffer);
          setPdfData(new Uint8Array(buffer));
        }
      } catch (err) {
        console.error("PDF Load Error:", err);
        // 如果出错，回退到使用原始 URL
        setPdfData(bookUrl);
      } finally {
        setLoading(false);
      }
    };
    loadPdf();
  }, [bookUrl]);

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-white">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#fff', overflow: 'hidden' }}>
      <PDFViewer
        config={{
          src: pdfData || bookUrl,
          theme: { preference: 'light' },
          zoom: { defaultZoomLevel: 1.0 },
          scroll: { defaultStrategy: ScrollStrategy.Vertical }
        }}
        style={{ height: '100%', width: '100%' }}
      />
    </div>
  );
}
