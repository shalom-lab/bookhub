import React, { useEffect, useState } from "react";
import { PDFViewer, ScrollStrategy } from '@embedpdf/react-pdf-viewer';
import { getBookOffline, saveBookOffline } from "../lib/offline";
import { Loader2, AlertCircle } from "lucide-react";

interface PdfReaderProps {
  bookUrl: string;
}

export default function PdfReader({ bookUrl }: PdfReaderProps) {
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState<string>("");
  const [pdfData, setPdfData] = useState<string | Uint8Array | Blob | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadPdf = async () => {
      setLoading(true);
      setError(null);
      try {
        // 1. 尝试从本地 IndexedDB 获取
        setProgress("正在从本地缓存读取...");
        const offlineBlob = await getBookOffline(bookUrl);
        
        if (offlineBlob) {
          setPdfData(offlineBlob);
          setProgress("");
        } else {
          // 2. 本地没有，则从网络下载
          setProgress("正在从网络下载文件...");
          const response = await fetch(bookUrl);
          
          if (!response.ok) throw new Error(`下载失败: ${response.statusText}`);
          
          // 对于大文件，分块读取并显示进度（可选改进，这里先简单化）
          const blob = await response.blob();
          
          setProgress("正在保存到本地缓存...");
          // 3. 存入本地 IndexedDB
          await saveBookOffline(bookUrl, blob);
          
          setPdfData(blob);
          setProgress("");
        }
      } catch (err: any) {
        console.error("PDF Load Error:", err);
        setError(err.message || "无法加载 PDF 文件");
        // 如果出错且有原始 URL，尝试直接使用 URL
        setPdfData(bookUrl);
      } finally {
        setLoading(false);
      }
    };
    loadPdf();
  }, [bookUrl]);

  if (loading) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-white gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
        <div className="flex flex-col items-center">
          <p className="text-sm font-medium text-gray-600">{progress}</p>
          <p className="text-xs text-gray-400 mt-1">较大文件可能需要一些时间</p>
        </div>
      </div>
    );
  }

  if (error && !pdfData) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-gray-50 p-6 text-center">
        <AlertCircle className="w-12 h-12 text-red-400 mb-4" />
        <h3 className="text-lg font-bold text-gray-800 mb-2">加载失败</h3>
        <p className="text-sm text-gray-500 max-w-xs mb-6">{error}</p>
        <button 
          onClick={() => window.location.reload()}
          className="px-6 py-2 bg-blue-500 text-white rounded-full text-sm font-bold shadow-lg"
        >
          重试
        </button>
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
