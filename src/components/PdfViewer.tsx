import React, { useEffect, useState, useRef } from "react";
import { getBookOffline, saveBookOffline } from "../lib/offline";
import { PDFViewer, PDFViewerRef } from '@embedpdf/react-pdf-viewer';
import { Loader2 } from "lucide-react";

interface PdfViewerProps {
  bookUrl: string;
  theme?: 'light' | 'dark' | 'sepia' | 'green';
}

const THEME_CONFIGS = {
  light: {
    preference: 'light' as const,
  },
  dark: {
    preference: 'dark' as const,
  },
  sepia: {
    preference: 'light' as const,
    light: {
      background: {
        app: "#FBF0D9",
        surface: "#FBF0D9",
        surfaceAlt: "#F2E2C4",
        input: "#F2E2C4",
      },
      foreground: {
        primary: "#5F4B32",
        secondary: "#7A654D",
      },
      accent: {
        primary: "#8B7E66",
        primaryHover: "#7A654D",
      },
      border: {
        default: "rgba(95, 75, 50, 0.1)",
      }
    }
  },
  green: {
    preference: 'light' as const,
    light: {
      background: {
        app: "#E1EAD8",
        surface: "#E1EAD8",
        surfaceAlt: "#D5E0CB",
        input: "#D5E0CB",
      },
      foreground: {
        primary: "#2C3E50",
        secondary: "#3E5871",
      },
      accent: {
        primary: "#4A6B8A",
        primaryHover: "#3E5871",
      },
      border: {
        default: "rgba(44, 62, 80, 0.1)",
      }
    }
  }
};

export default function PdfViewer({ bookUrl, theme = 'light' }: PdfViewerProps) {
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const viewerRef = useRef<PDFViewerRef>(null);

  // Initial theme config
  const initialTheme = THEME_CONFIGS[theme] || THEME_CONFIGS.light;

  // Handle dynamic theme changes smoothly via Ref API
  useEffect(() => {
    if (viewerRef.current) {
      const config = THEME_CONFIGS[theme] || THEME_CONFIGS.light;
      // The component expects preference or a full theme object
      // Based on docs, we can pass the preference or the full config
      viewerRef.current.setTheme(config.preference);
      // Wait, the docs say viewerRef.current?.setTheme(theme) where theme is 'light' | 'dark'
      // If we have custom overrides, we might need to pass the whole config or it might only support 'light'/'dark' via setTheme.
      // If it only supports 'light'/'dark' via setTheme, then for custom themes we might need to rely on prop updates.
      // But let's try to just pass the preference for now and see.
    }
  }, [theme]);

  useEffect(() => {
    if (!bookUrl) return;

    let isMounted = true;
    const loadPdfNative = async () => {
      setLoading(true);
      setError(null);
      try {
        let blob: Blob;
        const offlineBuffer = await getBookOffline(bookUrl);
        if (offlineBuffer) {
          blob = new Blob([offlineBuffer], { type: "application/pdf" });
        } else {
          const response = await fetch(bookUrl);
          if (!response.ok) throw new Error(`PDF 下载失败: ${response.status}`);
          const buffer = await response.arrayBuffer();
          await saveBookOffline(bookUrl, buffer);
          blob = new Blob([buffer], { type: "application/pdf" });
        }

        if (!isMounted) return;
        const url = URL.createObjectURL(blob);
        setObjectUrl(url);
        setLoading(false);
      } catch (err: any) {
        if (!isMounted) return;
        setError(err.message || "无法加载 PDF 文件");
        setLoading(false);
      }
    };

    loadPdfNative();

    return () => {
      isMounted = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
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
    <div className="w-full h-[calc(100vh-56px)] md:h-[calc(100vh-64px)] flex flex-col overflow-hidden">
      <PDFViewer
        ref={viewerRef}
        config={{
          src: objectUrl,
          theme: initialTheme,
          zoom: {
            defaultLevel: 'fit-width'
          }
        }}
      />
    </div>
  );
}
