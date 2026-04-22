import React, { useEffect, useRef } from "react";
import ePub, { Rendition } from "epubjs";
import { getBookOffline, saveBookOffline } from "../lib/offline";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface EpubViewerProps {
  bookUrl: string;
  theme: string;
  fontSize: number;
  flow: "paginated" | "scrolled";
  spread: "auto" | "none";
  themes: any;
  onTocLoaded: (toc: any[]) => void;
  onLocationChanged: (percentage: number) => void;
  onLoading: (loading: boolean) => void;
  onError: (error: string | null) => void;
  renditionRef: React.MutableRefObject<Rendition | null>;
}

export default function EpubViewer({
  bookUrl,
  theme,
  fontSize,
  flow,
  spread,
  themes,
  onTocLoaded,
  onLocationChanged,
  onLoading,
  onError,
  renditionRef
}: EpubViewerProps) {
  const viewerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!bookUrl || !viewerRef.current) return;

    const initEpub = async () => {
      onLoading(true);
      onError(null);
      try {
        let bookData: any = bookUrl;
        
        const offlineBuffer = await getBookOffline(bookUrl);
        if (offlineBuffer) {
          bookData = offlineBuffer;
        } else {
          const response = await fetch(bookUrl);
          if (!response.ok) throw new Error(`书籍获取失败: ${response.status}`);
          const buffer = await response.arrayBuffer();
          await saveBookOffline(bookUrl, buffer);
          bookData = buffer;
        }

        const book = ePub(bookData);
        const rendition = book.renderTo(viewerRef.current!, {
          width: "100%",
          height: "100%",
          flow: flow,
          manager: flow === "scrolled" ? "continuous" : "default",
          spread: spread,
        });

        renditionRef.current = rendition;

        // Register themes
        Object.entries(themes).forEach(([key, value]: [string, any]) => {
          rendition.themes.register(key, {
            body: {
              background: `${value.bg} !important`,
              color: `${value.fg} !important`,
              "font-family": "var(--font-serif) !important",
              padding: window.innerWidth < 768 ? "20px 10px !important" : "40px 0 !important",
            },
            "p, div, span, h1, h2, h3, h4, h5, h6": {
              color: `${value.fg} !important`,
            }
          });
        });

        rendition.themes.select(theme);
        rendition.themes.fontSize(`${fontSize}%`);

        const savedLocation = localStorage.getItem(`read_pos_${bookUrl}`);
        const display = rendition.display(savedLocation || undefined);

        display.then(() => {
          onLoading(false);
        });

        book.loaded.navigation.then((nav) => {
          onTocLoaded(nav.toc);
        });

        rendition.on("relocated", (location: any) => {
          localStorage.setItem(`read_pos_${bookUrl}`, location.start.cfi);
          if (location.start.percentage) {
            onLocationChanged(location.start.percentage * 100);
          }
        });

        const handleKeydown = (e: KeyboardEvent) => {
          if (e.key === "ArrowLeft") rendition.prev();
          if (e.key === "ArrowRight") rendition.next();
        };
        window.addEventListener("keydown", handleKeydown);

        return () => {
          book.destroy();
          window.removeEventListener("keydown", handleKeydown);
        };
      } catch (err: any) {
        console.error("EPUB Loading Error:", err);
        onError(err.message || "加载失败");
        onLoading(false);
      }
    };

    initEpub();
  }, [bookUrl, flow, spread]); // Re-render if flow or spread changes

  // Dynamic theme/font updates without re-initializing
  useEffect(() => {
    if (renditionRef.current) {
      renditionRef.current.themes.select(theme);
      renditionRef.current.themes.fontSize(`${fontSize}%`);
    }
  }, [theme, fontSize]);

  return (
    <div className="h-full w-full relative group">
      <div ref={viewerRef} className="h-full w-full" />
      
      {/* 左右悬浮翻页按钮 */}
      {flow === "paginated" && (
        <>
          <button
            onClick={() => renditionRef.current?.prev()}
            className="absolute left-0 top-0 bottom-0 w-20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10"
          >
            <div className="p-4 bg-black/10 hover:bg-black/20 rounded-full backdrop-blur-sm">
              <ChevronLeft className="w-8 h-8 text-black/40" />
            </div>
          </button>
          
          <button
            onClick={() => renditionRef.current?.next()}
            className="absolute right-0 top-0 bottom-0 w-20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10"
          >
            <div className="p-4 bg-black/10 hover:bg-black/20 rounded-full backdrop-blur-sm">
              <ChevronRight className="w-8 h-8 text-black/40" />
            </div>
          </button>
        </>
      )}
    </div>
  );
}
