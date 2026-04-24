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
  const [pdfDataUrl, setPdfDataUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    let currentObjectUrl: string | null = null;

    const cleanup = () => {
      if (currentObjectUrl) {
        URL.revokeObjectURL(currentObjectUrl);
        currentObjectUrl = null;
      }
    };

    const loadPdf = async () => {
      if (!isMounted) return;
      setLoading(true);
      setError(null);
      
      const controller = new AbortController();
      const signal = controller.signal;

      try {
        // 1. 尝试从本地 IndexedDB 获取
        setProgress("正在从本地缓存读取...");
        const offlineBlob = await getBookOffline(bookUrl);
        
        if (!isMounted) return;

        if (offlineBlob) {
          cleanup();
          currentObjectUrl = URL.createObjectURL(offlineBlob);
          setPdfDataUrl(currentObjectUrl);
          setProgress("");
        } else {
          // 2. 本地没有，则从网络下载
          setProgress("正在从网络下载文件...");
          
          // 尝试获取 GitHub Token 以支持私有仓库
          const token = localStorage.getItem("gh-bookhub-token");
          const headers: HeadersInit = {};
          if (token && bookUrl.includes("github")) {
            headers["Authorization"] = `token ${token}`;
          }

          const response = await fetch(bookUrl, { signal, headers });
          
          if (!isMounted) return;
          if (!response.ok) throw new Error(`下载失败: ${response.statusText} (${response.status})`);
          
          const blob = await response.blob();
          
          if (!isMounted) return;
          setProgress("正在保存到本地缓存...");
          
          await saveBookOffline(bookUrl, blob);
          
          if (!isMounted) return;
          cleanup();
          currentObjectUrl = URL.createObjectURL(blob);
          setPdfDataUrl(currentObjectUrl);
          setProgress("");
        }
      } catch (err: any) {
        if (err.name === 'AbortError') return;
        if (!isMounted) return;
        
        console.error("PDF Load Error:", err);
        // 如果出错且有原始 URL，尝试直接使用 URL，并清除错误状态让 Viewer 尝试加载
        setPdfDataUrl(bookUrl);
        setError(null); 
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }

      return controller;
    };

    const task = loadPdf();

    return () => {
      isMounted = false;
      cleanup();
      task.then(controller => controller?.abort());
    };
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

  if (error && !pdfDataUrl) {
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
          src: pdfDataUrl || bookUrl,
          theme: { preference: 'light' },
          zoom: { defaultZoomLevel: 1.0 },
          scroll: { defaultStrategy: ScrollStrategy.Vertical }
        }}
        style={{ height: '100%', width: '100%' }}
      />
    </div>
  );
}
