import React, { useEffect, useRef, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import ePub, { Rendition } from "epubjs";
import * as pdfjsLib from "pdfjs-dist";
import { getBookOffline, saveBookOffline } from "../lib/offline";
import { ChevronLeft, ChevronRight, X, Settings, List, Loader2, Minus, Plus, Type, Palette, MousePointer2, Maximize2, Minimize2, BookOpen } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

// Set worker source for pdfjs - using unpkg for version 5.x
// @ts-ignore
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@5.6.205/build/pdf.worker.min.mjs`;

const THEMES = {
  default: {
    name: "默认",
    bg: "#fdfaf6",
    fg: "#4a4a4a",
  },
  parchment: {
    name: "羊皮纸",
    bg: "#f4ecd8",
    fg: "#5b4636",
  },
  green: {
    name: "护眼绿",
    bg: "#c7edcc",
    fg: "#2c3e50",
  },
  dark: {
    name: "夜间",
    bg: "#1a1a1a",
    fg: "#d1d1d1",
  },
};

export default function Reader() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const bookUrl = searchParams.get("url");
  const bookTitle = searchParams.get("title") || "阅读器";
  
  const viewerRef = useRef<HTMLDivElement>(null);
  const renditionRef = useRef<Rendition | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toc, setToc] = useState<any[]>([]);
  const [showToc, setShowToc] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [location, setLocation] = useState<string | null>(null);
  
  // PDF State
  const [pdf, setPdf] = useState<any>(null);
  const [pdfPage, setPdfPage] = useState(1);
  const [pdfTotalPages, setPdfTotalPages] = useState(0);
  const [pdfScale, setPdfScale] = useState(1.0);
  const [theme, setTheme] = useState<keyof typeof THEMES>(() => 
    (localStorage.getItem("reader_theme") as keyof typeof THEMES) || "default"
  );
  const [flow, setFlow] = useState<"paginated" | "scrolled">(() => 
    (localStorage.getItem("reader_flow") as "paginated" | "scrolled") || "paginated"
  );
  const [pdfFit, setPdfFit] = useState<"width" | "page">(() => 
    (localStorage.getItem("reader_pdf_fit") as "width" | "page") || "width"
  );
  const [spread, setSpread] = useState<"auto" | "none">(() => 
    (localStorage.getItem("reader_spread") as "auto" | "none") || "auto"
  );
  const [pdfSpread, setPdfSpread] = useState<boolean>(() => 
    localStorage.getItem("reader_pdf_spread") === "true"
  );
  
  const [isRendering, setIsRendering] = useState(false);
  const [epubPercentage, setEpubPercentage] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const canvasRefRight = useRef<HTMLCanvasElement>(null);
  const pdfContainerRef = useRef<HTMLDivElement>(null);
  
  // Immersive Mode
  const [showControls, setShowControls] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  // Reader Settings
  const [fontSize, setFontSize] = useState(() => {
    const saved = localStorage.getItem("reader_font_size");
    return saved ? parseInt(saved, 10) : 100;
  });

  const isPdf = bookUrl?.split('?')[0].toLowerCase().endsWith(".pdf");

  // EPUB initialization
  useEffect(() => {
    if (!bookUrl || !viewerRef.current || isPdf) return;

    const initEpub = async () => {
      setLoading(true);
      setError(null);
      try {
        let bookData: any = bookUrl;
        
        // Try offline first
        const offlineBuffer = await getBookOffline(bookUrl);
        if (offlineBuffer) {
          bookData = offlineBuffer;
        } else {
          // Fetch and save for next time
          const response = await fetch(bookUrl);
          if (!response.ok) throw new Error(`书籍获取失败: ${response.status} ${response.statusText}`);
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
        Object.entries(THEMES).forEach(([key, value]) => {
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

        // Load saved progress
        const savedLocation = localStorage.getItem(`read_pos_${bookUrl}`);
        const display = rendition.display(savedLocation || undefined);

        display.then(() => {
          setLoading(false);
        });

        book.loaded.navigation.then((nav) => {
          setToc(nav.toc);
        });

        rendition.on("relocated", (location: any) => {
          localStorage.setItem(`read_pos_${bookUrl}`, location.start.cfi);
          if (location.start.percentage) {
            setEpubPercentage(location.start.percentage * 100);
          }
        });

        // Keyboard navigation
        const handleKeydown = (e: KeyboardEvent) => {
          if (e.key === "ArrowLeft") rendition.prev();
          if (e.key === "ArrowRight") rendition.next();
        };
        window.addEventListener("keydown", handleKeydown);

        return () => {
          book.destroy();
          window.removeEventListener("keydown", handleKeydown);
        };
      } catch (err) {
        console.error("Failed to load EPUB:", err);
        setLoading(false);
      }
    };

    initEpub();
  }, [bookUrl, flow, isPdf]);

  // PDF initialization
  useEffect(() => {
    if (!bookUrl || !isPdf) return;

    const loadPdf = async () => {
      setLoading(true);
      setError(null);
      try {
        let pdfData: any = bookUrl;
        
        // Try offline first
        const offlineBuffer = await getBookOffline(bookUrl);
        if (offlineBuffer) {
          pdfData = { data: new Uint8Array(offlineBuffer) };
        } else {
          // Fetch and save
          const response = await fetch(bookUrl);
          if (!response.ok) throw new Error(`PDF 获取失败: ${response.status} ${response.statusText}`);
          const buffer = await response.arrayBuffer();
          await saveBookOffline(bookUrl, buffer);
          pdfData = { data: new Uint8Array(buffer) };
        }

        const loadingTask = pdfjsLib.getDocument(pdfData);
        const pdfDoc = await loadingTask.promise;
        
        if (pdfDoc.numPages === 0) {
          throw new Error("该 PDF 文件不包含任何页面或已损坏");
        }
        
        setPdf(pdfDoc);
        setPdfTotalPages(pdfDoc.numPages);
        setError(null);

        // Load PDF TOC (Outline)
        try {
          const outline = await pdfDoc.getOutline();
          if (outline) {
            const flattenOutline = (items: any[], level = 0): any[] => {
              let result: any[] = [];
              items.forEach(item => {
                result.push({
                  id: Math.random().toString(36).substr(2, 9),
                  label: "  ".repeat(level) + item.title,
                  isPdf: true,
                  dest: item.dest
                });
                if (item.items && item.items.length > 0) {
                  result = result.concat(flattenOutline(item.items, level + 1));
                }
              });
              return result;
            };
            setToc(flattenOutline(outline));
          }
        } catch (e) {
          console.warn("Could not load PDF outline");
        }
        
        const savedPage = localStorage.getItem(`read_pos_${bookUrl}`);
        if (savedPage) {
          // Only use numeric saved page if it's not a CFI (EPUB location)
          if (!savedPage.includes("/") && !savedPage.includes(":")) {
            setPdfPage(parseInt(savedPage, 10) || 1);
          }
        }
      } catch (err: any) {
        console.error("Error loading PDF:", err);
        setError(err.message || "加载 PDF 失败");
        if (err.message?.includes("worker")) {
          setError("PDF 解析引擎加载失败，请检查网络连接");
        }
      } finally {
        setLoading(false);
      }
    };

    loadPdf();

    return () => {
      if (pdf) {
        pdf.destroy();
      }
    };
  }, [bookUrl, isPdf]);

  // Handle window resize for PDF
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const renderTaskRef = useRef<any>(null);
  const renderTaskRefRight = useRef<any>(null);

  useEffect(() => {
    if (!pdf || !canvasRef.current) return;

    const renderPage = async () => {
      if (renderTaskRef.current) renderTaskRef.current.cancel();
      if (renderTaskRefRight.current) renderTaskRefRight.current.cancel();

      setIsRendering(true);
      try {
        const container = pdfContainerRef.current;
        if (!container) return;

        // Reset scroll position
        container.scrollTo(0, 0);

        const isDouble = pdfSpread && windowWidth > 1024 && pdfTotalPages > 1;
        const page = await pdf.getPage(pdfPage);
        const unscaledViewport = page.getViewport({ scale: 1 });
        
        let targetScale = pdfScale;
        const padding = 40;
        const availableWidth = isDouble ? (container.clientWidth / 2) - padding : container.clientWidth - padding;

        if (pdfFit === "width") {
          targetScale = (availableWidth / unscaledViewport.width) * pdfScale;
        } else if (pdfFit === "page") {
          const availableHeight = container.clientHeight - padding;
          const scaleW = availableWidth / unscaledViewport.width;
          const scaleH = availableHeight / unscaledViewport.height;
          targetScale = Math.min(scaleW, scaleH) * pdfScale;
        }

        const viewport = page.getViewport({ scale: targetScale });
        const canvas = canvasRef.current!;
        const context = canvas.getContext("2d");
        if (context) {
          canvas.height = viewport.height;
          canvas.width = viewport.width;
          const renderTask = (page as any).render({ canvasContext: context, viewport });
          renderTaskRef.current = renderTask;
          await renderTask.promise;
        }

        // Render second page if in double spread mode
        if (isDouble && pdfPage < pdfTotalPages && canvasRefRight.current) {
          const pageRight = await pdf.getPage(pdfPage + 1);
          const canvasRight = canvasRefRight.current;
          const contextRight = canvasRight.getContext("2d");
          if (contextRight) {
            canvasRight.height = viewport.height;
            canvasRight.width = viewport.width;
            const renderTaskRight = (pageRight as any).render({ canvasContext: contextRight, viewport });
            renderTaskRefRight.current = renderTaskRight;
            await renderTaskRight.promise;
          }
        }
        localStorage.setItem(`read_pos_${bookUrl}`, pdfPage.toString());
      } catch (err: any) {
        if (err.name === "RenderingCancelledException") return;
        console.error("PDF Render Error:", err);
      } finally {
        setIsRendering(false);
      }
    };

    renderPage();
  }, [pdf, pdfPage, pdfScale, pdfFit, pdfSpread, bookUrl, windowWidth]);

  // PDF Navigation
  const pdfNext = React.useCallback(() => {
    const step = (pdfSpread && windowWidth > 1024) ? 2 : 1;
    setPdfPage((prev) => Math.min(prev + step, pdfTotalPages));
  }, [pdfSpread, windowWidth, pdfTotalPages]);

  const pdfPrev = React.useCallback(() => {
    const step = (pdfSpread && windowWidth > 1024) ? 2 : 1;
    setPdfPage((prev) => Math.max(prev - step, 1));
  }, [pdfSpread, windowWidth]);

  // Keyboard navigation for PDF
  useEffect(() => {
    if (!isPdf) return;
    const handleKeydown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") pdfPrev();
      if (e.key === "ArrowRight") pdfNext();
    };
    window.addEventListener("keydown", handleKeydown);
    return () => window.removeEventListener("keydown", handleKeydown);
  }, [isPdf, pdfPrev, pdfNext]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
        setIsFullscreen(false);
      }
    }
  };

  useEffect(() => {
    const handleFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handleFsChange);
    return () => document.removeEventListener("fullscreenchange", handleFsChange);
  }, []);

  const toggleControls = () => setShowControls(!showControls);

  // Update settings and persist
  useEffect(() => {
    localStorage.setItem("reader_theme", theme);
    localStorage.setItem("reader_flow", flow);
    localStorage.setItem("reader_pdf_fit", pdfFit);
    localStorage.setItem("reader_spread", spread);
    localStorage.setItem("reader_pdf_spread", pdfSpread.toString());
    localStorage.setItem("reader_font_size", fontSize.toString());

    if (!isPdf && renditionRef.current) {
      renditionRef.current.themes.fontSize(`${fontSize}%`);
      renditionRef.current.themes.select(theme);
    }
  }, [fontSize, theme, flow, pdfFit, spread, pdfSpread, isPdf]);

  const next = () => isPdf ? pdfNext() : renditionRef.current?.next();
  const prev = () => isPdf ? pdfPrev() : renditionRef.current?.prev();

  if (!bookUrl) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p>未找到书籍链接</p>
      </div>
    );
  }

  return (
    <div className="reader-container h-screen flex flex-col overflow-hidden" style={{ backgroundColor: THEMES[theme].bg }}>
      {/* Header */}
      <AnimatePresence>
        {showControls && (
          <motion.div 
            initial={{ y: -60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -60, opacity: 0 }}
            className="h-14 backdrop-blur-md border-b flex items-center justify-between px-4 z-40 transition-colors fixed top-0 left-0 right-0"
            style={{ 
              backgroundColor: `${THEMES[theme].bg}CC`, 
              borderColor: theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
              color: THEMES[theme].fg
            }}
          >
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate(-1)}
                className="p-2 hover:bg-black/5 rounded-full transition-colors"
                style={{ color: THEMES[theme].fg }}
              >
                <X className="w-5 h-5" />
              </button>
              <h2 className="text-sm font-serif truncate max-w-[150px] md:max-w-md">
                {bookTitle}
              </h2>
            </div>
            <div className="flex items-center gap-1 md:gap-2">
              <button
                onClick={toggleFullscreen}
                className="p-2 hover:bg-black/5 rounded-full transition-colors"
                title="全屏"
                style={{ color: THEMES[theme].fg }}
              >
                {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
              </button>
              <button
                onClick={() => {
                  setShowToc(!showToc);
                  if (showSettings) setShowSettings(false);
                }}
                className={`p-2 hover:bg-black/5 rounded-full transition-colors ${showToc ? 'bg-black/5' : ''} ${isPdf ? 'hidden' : ''}`}
                title="目录"
                style={{ color: THEMES[theme].fg }}
              >
                <List className="w-5 h-5" />
              </button>
              <button 
                onClick={() => {
                  setShowSettings(!showSettings);
                  if (showToc) setShowToc(false);
                }}
                className={`p-2 hover:bg-black/5 rounded-full transition-colors ${showSettings ? 'bg-black/5' : ''}`}
                title="设置"
                style={{ color: THEMES[theme].fg }}
              >
                <Settings className="w-5 h-5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="fixed top-0 left-0 right-0 h-0.5 z-50">
        <div 
          className="h-full bg-[#8b7e66] transition-all duration-300"
          style={{ 
            width: isPdf ? `${(pdfPage / pdfTotalPages) * 100}%` : `${epubPercentage}%`,
            opacity: showControls ? 1 : 0.3
          }}
        />
      </div>

      {/* Main Content */}
      <div className="relative flex-1 flex overflow-hidden">
        {/* TOC Sidebar */}
        <AnimatePresence>
          {showToc && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowToc(false)}
                className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 md:hidden"
              />
              <motion.div 
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 25, stiffness: 200 }}
                className="fixed inset-x-0 bottom-0 top-16 md:top-auto md:relative md:inset-auto w-full md:w-72 h-[calc(100%-4rem)] md:h-full bg-white border-t md:border-r border-black/5 z-50 md:z-20 overflow-y-auto p-6 shadow-2xl md:shadow-sm md:!translate-y-0 rounded-t-3xl md:rounded-none flex flex-col shrink-0"
              >
                <div className="flex items-center justify-between mb-6 pb-2 border-b border-black/5 shrink-0">
                  <h3 className="font-serif text-lg text-[#4a4a4a]">目录</h3>
                  <button onClick={() => setShowToc(false)} className="p-2 hover:bg-black/5 rounded-full">
                    <X className="w-5 h-5 md:w-4 md:h-4" />
                  </button>
                </div>
                <ul className="space-y-1 flex-1 overflow-y-auto">
                  {toc.map((item) => (
                    <li key={item.id || item.href}>
                      <button
                        onClick={async () => {
                          if (item.isPdf) {
                            // PDF Jump logic
                            if (pdf) {
                              try {
                                let dest = item.dest;
                                if (typeof dest === 'string') {
                                  dest = await pdf.getDestination(dest);
                                }
                                if (Array.isArray(dest)) {
                                  const pageIndex = await pdf.getPageIndex(dest[0]);
                                  setPdfPage(pageIndex + 1);
                                }
                              } catch (e) {
                                console.error("PDF Jump failed:", e);
                              }
                            }
                          } else {
                            renditionRef.current?.display(item.href);
                          }
                          if (window.innerWidth < 768) setShowToc(false);
                        }}
                        className="text-left text-base md:text-sm text-[#4a4a4a]/80 hover:text-[#8b7e66] hover:bg-[#fdfaf6] transition-all w-full py-3 md:py-2 px-3 rounded-lg"
                        style={{ color: THEMES[theme].fg }}
                      >
                        {item.label}
                      </button>
                    </li>
                  ))}
                </ul>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Settings Panel */}
        <AnimatePresence>
          {showSettings && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowSettings(false)}
                className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 md:hidden"
              />
              <motion.div 
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 25, stiffness: 200 }}
                className="fixed inset-x-0 bottom-0 md:absolute md:inset-auto md:right-4 md:top-4 w-full md:w-72 border-t md:border z-50 md:z-40 rounded-t-3xl md:rounded-2xl shadow-2xl p-6 space-y-8 md:!translate-y-0"
                style={{ 
                  backgroundColor: THEMES[theme].bg, 
                  color: THEMES[theme].fg,
                  borderColor: theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'
                }}
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-serif text-lg">阅读设置</h3>
                  <button 
                    onClick={() => setShowSettings(false)} 
                    className="p-2 hover:bg-black/5 rounded-full"
                    style={{ color: THEMES[theme].fg }}
                  >
                    <X className="w-5 h-5 md:w-4 md:h-4" />
                  </button>
                </div>

            {/* Font Size */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs text-[#8b7e66] uppercase tracking-wider font-medium">
                <Type className="w-3 h-3" />
                字体大小
              </div>
              <div className="flex items-center justify-between bg-[#fdfaf6] p-1 rounded-full border border-[#8b7e66]/10">
                <button 
                  onClick={() => setFontSize(Math.max(50, fontSize - 10))}
                  className="p-2 hover:bg-white rounded-full transition-colors shadow-sm"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="text-sm font-medium">{fontSize}%</span>
                <button 
                  onClick={() => setFontSize(Math.min(200, fontSize + 10))}
                  className="p-2 hover:bg-white rounded-full transition-colors shadow-sm"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Themes */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs text-[#8b7e66] uppercase tracking-wider font-medium">
                <Palette className="w-3 h-3" />
                阅读主题
              </div>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(THEMES).map(([key, value]) => (
                  <button
                    key={key}
                    onClick={() => setTheme(key as keyof typeof THEMES)}
                    className={`flex flex-col items-center gap-2 p-3 rounded-xl border transition-all ${
                      theme === key ? 'border-[#8b7e66] bg-[#fdfaf6] shadow-sm' : 'border-transparent hover:bg-[#fdfaf6]'
                    }`}
                  >
                    <div 
                      className="w-full h-8 rounded-md border border-black/5" 
                      style={{ backgroundColor: value.bg }}
                    />
                    <span className="text-[10px] font-medium">{value.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Flow Mode / PDF Zoom */}
            {/* Flow Mode (EPUB) / PDF Zoom & Fit */}
            {isPdf ? (
              <>
                {/* Fit Mode */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-xs text-[#8b7e66] uppercase tracking-wider font-medium">
                    <Maximize2 className="w-3 h-3" />
                    显示模式
                  </div>
                  <div className="flex bg-[#fdfaf6] p-1 rounded-xl border border-[#8b7e66]/10">
                    <button
                      onClick={() => setPdfFit("width")}
                      className={`flex-1 py-2 text-xs rounded-lg transition-all ${
                        pdfFit === "width" ? 'bg-white shadow-sm text-[#8b7e66]' : 'text-[#8b7e66]/40'
                      }`}
                    >
                      适合宽度
                    </button>
                    <button
                      onClick={() => setPdfFit("page")}
                      className={`flex-1 py-2 text-xs rounded-lg transition-all ${
                        pdfFit === "page" ? 'bg-white shadow-sm text-[#8b7e66]' : 'text-[#8b7e66]/40'
                      }`}
                    >
                      适合页面
                    </button>
                  </div>
                </div>

                {/* PDF Page Layout */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-xs text-[#8b7e66] uppercase tracking-wider font-medium">
                    <BookOpen className="w-3 h-3" />
                    页面布局
                  </div>
                  <div className="flex bg-[#fdfaf6] p-1 rounded-xl border border-[#8b7e66]/10">
                    <button
                      onClick={() => setPdfSpread(false)}
                      className={`flex-1 py-2 text-xs rounded-lg transition-all ${
                        !pdfSpread ? 'bg-white shadow-sm text-[#8b7e66]' : 'text-[#8b7e66]/40'
                      }`}
                    >
                      单页
                    </button>
                    <button
                      onClick={() => setPdfSpread(true)}
                      className={`flex-1 py-2 text-xs rounded-lg transition-all ${
                        pdfSpread ? 'bg-white shadow-sm text-[#8b7e66]' : 'text-[#8b7e66]/40'
                      }`}
                    >
                      双页
                    </button>
                  </div>
                </div>

                {/* Zoom Slider */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-xs text-[#8b7e66] uppercase tracking-wider font-medium">
                    <Plus className="w-3 h-3" />
                    缩放倍率
                  </div>
                  <div className="space-y-4 px-2">
                    <input 
                      type="range" 
                      min="0.5" 
                      max="3" 
                      step="0.1" 
                      value={pdfScale} 
                      onChange={(e) => setPdfScale(parseFloat(e.target.value))}
                      className="w-full accent-[#8b7e66]"
                    />
                    <div className="flex justify-between text-[10px] text-[#8b7e66]/60">
                      <span>50%</span>
                      <span className="font-bold text-[#8b7e66]">{Math.round(pdfScale * 100)}%</span>
                      <span>300%</span>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-xs text-[#8b7e66] uppercase tracking-wider font-medium">
                    <MousePointer2 className="w-3 h-3" />
                    翻页模式
                  </div>
                  <div className="flex bg-[#fdfaf6] p-1 rounded-xl border border-[#8b7e66]/10">
                    <button
                      onClick={() => setFlow("paginated")}
                      className={`flex-1 py-2 text-xs rounded-lg transition-all ${
                        flow === "paginated" ? 'bg-white shadow-sm text-[#8b7e66]' : 'text-[#8b7e66]/40 hover:text-[#8b7e66]/60'
                      }`}
                    >
                      左右翻页
                    </button>
                    <button
                      onClick={() => setFlow("scrolled")}
                      className={`flex-1 py-2 text-xs rounded-lg transition-all ${
                        flow === "scrolled" ? 'bg-white shadow-sm text-[#8b7e66]' : 'text-[#8b7e66]/40 hover:text-[#8b7e66]/60'
                      }`}
                    >
                      垂直滚动
                    </button>
                  </div>
                </div>
                {flow === "paginated" && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-xs text-[#8b7e66] uppercase tracking-wider font-medium">
                      <BookOpen className="w-3 h-3" />
                      页面布局
                    </div>
                    <div className="flex bg-[#fdfaf6] p-1 rounded-xl border border-[#8b7e66]/10">
                      <button
                        onClick={() => setSpread("none")}
                        className={`flex-1 py-2 text-xs rounded-lg transition-all ${
                          spread === "none" ? 'bg-white shadow-sm text-[#8b7e66]' : 'text-[#8b7e66]/40'
                        }`}
                      >
                        单页
                      </button>
                      <button
                        onClick={() => setSpread("auto")}
                        className={`flex-1 py-2 text-xs rounded-lg transition-all ${
                          spread === "auto" ? 'bg-white shadow-sm text-[#8b7e66]' : 'text-[#8b7e66]/40'
                        }`}
                      >
                        双页 (自动)
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
            </motion.div>
          </>
        )}
        </AnimatePresence>

        {/* Viewer */}
        <div 
          className="flex-1 relative flex flex-col items-center transition-colors duration-500 overflow-hidden"
          style={{ backgroundColor: THEMES[theme].bg }}
        >
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center z-50" style={{ backgroundColor: THEMES[theme].bg }}>
              <div className="flex flex-col items-center gap-4">
                <Loader2 className="w-8 h-8 animate-spin text-[#8b7e66]" />
                <p className="text-sm text-[#8b7e66] font-serif">正在准备书籍...</p>
              </div>
            </div>
          )}

          {error && (
            <div className="absolute inset-0 flex items-center justify-center z-50 px-6 text-center" style={{ backgroundColor: THEMES[theme].bg }}>
              <div className="max-w-xs space-y-4">
                <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mx-auto">
                  <X className="w-6 h-6 text-red-500" />
                </div>
                <p className="text-[var(--text-color)] font-serif">{error}</p>
                <button 
                  onClick={() => window.location.reload()}
                  className="px-6 py-2 bg-[var(--primary-color)] text-white rounded-full text-sm"
                >
                  重试
                </button>
              </div>
            </div>
          )}
          
          <div className="relative w-full max-w-4xl h-full flex items-center justify-center">
            {/* Navigation Controls */}
            {(flow === "paginated" || isPdf) && (
              <>
                <button
                  onClick={prev}
                  className="absolute left-0 top-0 bottom-0 w-[15%] md:w-auto md:h-auto md:top-1/2 md:-translate-y-1/2 flex flex-col items-center justify-center gap-2 group z-20"
                >
                  <div className="hidden md:flex p-3 md:p-4 bg-white/40 hover:bg-white/90 rounded-full transition-all shadow-sm group-hover:scale-110 border border-black/5">
                    <ChevronLeft className="w-6 h-6 md:w-8 md:h-8 text-[#4a4a4a]" />
                  </div>
                  <span className="hidden md:block text-[10px] text-[#8b7e66] font-serif opacity-0 group-hover:opacity-100 transition-opacity">上一页</span>
                </button>
                <button
                  onClick={next}
                  className="absolute right-0 top-0 bottom-0 w-[15%] md:w-auto md:h-auto md:top-1/2 md:-translate-y-1/2 flex flex-col items-center justify-center gap-2 group z-20"
                >
                  <div className="hidden md:flex p-3 md:p-4 bg-white/40 hover:bg-white/90 rounded-full transition-all shadow-sm group-hover:scale-110 border border-black/5">
                    <ChevronRight className="w-6 h-6 md:w-8 md:h-8 text-[#4a4a4a]" />
                  </div>
                  <span className="hidden md:block text-[10px] text-[#8b7e66] font-serif opacity-0 group-hover:opacity-100 transition-opacity">下一页</span>
                </button>
              </>
            )}

            {isPdf ? (
              <div 
                ref={pdfContainerRef}
                className="w-full h-full flex flex-col items-center overflow-y-auto pt-20 pb-20 scrollbar-hide relative"
              >
                {isRendering && (
                  <div className="absolute inset-0 flex items-center justify-center bg-transparent z-10">
                    <Loader2 className="w-8 h-8 animate-spin text-[#8b7e66] opacity-40" />
                  </div>
                )}
                <div className={`flex items-start justify-center gap-4 transition-opacity duration-300 ${isRendering ? 'opacity-50' : 'opacity-100'} ${pdfSpread && windowWidth > 1024 ? 'w-full px-10' : ''}`}>
                  <canvas 
                    ref={canvasRef} 
                    className="shadow-2xl bg-white max-w-full" 
                    style={{ 
                      filter: theme === 'dark' ? 'invert(0.9) hue-rotate(180deg)' : 
                              theme === 'parchment' ? 'sepia(0.4) contrast(0.9)' : 
                              theme === 'green' ? 'sepia(0.1) hue-rotate(80deg) saturate(0.8)' : 'none'
                    }}
                  />
                  {pdfSpread && windowWidth > 1024 && pdfPage < pdfTotalPages && (
                    <canvas 
                      ref={canvasRefRight} 
                      className="shadow-2xl bg-white max-w-full" 
                      style={{ 
                        filter: theme === 'dark' ? 'invert(0.9) hue-rotate(180deg)' : 
                                theme === 'parchment' ? 'sepia(0.4) contrast(0.9)' : 
                                theme === 'green' ? 'sepia(0.1) hue-rotate(80deg) saturate(0.8)' : 'none'
                      }}
                    />
                  )}
                </div>
                <div className="mt-8 px-6 py-2 bg-[var(--primary-color)]/80 backdrop-blur-md text-white text-[10px] font-serif rounded-full z-30 shadow-lg tracking-widest">
                  第 {pdfPage}{pdfSpread && windowWidth > 1024 && pdfPage < pdfTotalPages ? `-${pdfPage+1}` : ''} 页 / 共 {pdfTotalPages} 页
                </div>
              </div>
            ) : (
              <div 
                ref={viewerRef} 
                className={`epub-viewer w-full h-full mx-auto px-4 md:px-16 ${flow === "scrolled" ? 'overflow-y-auto' : ''}`} 
              />
            )}

            {/* Mobile Touch Zones */}
            {flow === "paginated" && (
              <div className="absolute inset-0 flex md:hidden z-10">
                <div className="w-[30%] h-full" onClick={prev} />
                <div className="w-[40%] h-full" onClick={() => {
                  /* maybe toggle header/footer? */
                }} />
                <div className="w-[30%] h-full" onClick={next} />
              </div>
            )}
          </div>
        </div>
      </div>


      {/* Mobile Controls */}
      <AnimatePresence>
        {showControls && (
          <motion.div 
            initial={{ y: 60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 60, opacity: 0 }}
            className="md:hidden h-16 backdrop-blur-md border-t flex items-center justify-around fixed bottom-0 left-0 right-0 z-40 transition-colors"
            style={{ 
              backgroundColor: `${THEMES[theme].bg}CC`, 
              borderColor: theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
              color: THEMES[theme].fg
            }}
          >
            <button onClick={prev} className="p-4">
              <ChevronLeft className="w-6 h-6" />
            </button>
            <div className="text-[10px] opacity-50 font-serif">
              {isPdf ? `第 ${pdfPage} / ${pdfTotalPages} 页` : (flow === "paginated" ? "点击侧边或左右滑动" : "上下滑动阅读")}
            </div>
            <button onClick={next} className="p-4">
              <ChevronRight className="w-6 h-6" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Touch Toggle Area */}
      <div 
        className="fixed inset-x-0 top-1/4 bottom-1/4 z-0 pointer-events-auto md:w-1/2 md:left-1/4"
        onClick={toggleControls}
      />
    </div>
  );
}
