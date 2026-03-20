import React, { useEffect, useRef, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import ePub, { Rendition } from "epubjs";
import { ChevronLeft, ChevronRight, X, Settings, List, Loader2, Minus, Plus, Type, Palette, MousePointer2 } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

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
  const [toc, setToc] = useState<any[]>([]);
  const [showToc, setShowToc] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [location, setLocation] = useState<string | null>(null);
  
  // Reader Settings
  const [fontSize, setFontSize] = useState(() => {
    const saved = localStorage.getItem("reader_font_size");
    return saved ? parseInt(saved, 10) : 100;
  });
  const [theme, setTheme] = useState<keyof typeof THEMES>(() => {
    const saved = localStorage.getItem("reader_theme");
    return (saved && THEMES[saved as keyof typeof THEMES]) ? (saved as keyof typeof THEMES) : "default";
  });
  const [flow, setFlow] = useState<"paginated" | "scrolled">(() => {
    const saved = localStorage.getItem("reader_flow");
    return (saved === "paginated" || saved === "scrolled") ? saved : "paginated";
  });

  useEffect(() => {
    localStorage.setItem("reader_font_size", fontSize.toString());
  }, [fontSize]);

  useEffect(() => {
    localStorage.setItem("reader_theme", theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem("reader_flow", flow);
  }, [flow]);

  useEffect(() => {
    if (!bookUrl || !viewerRef.current) return;

    const book = ePub(bookUrl);
    const rendition = book.renderTo(viewerRef.current, {
      width: "100%",
      height: "100%",
      flow: flow,
      manager: flow === "scrolled" ? "continuous" : "default",
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
      setLocation(location.start.cfi);
      localStorage.setItem(`read_pos_${bookUrl}`, location.start.cfi);
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
  }, [bookUrl, flow]); // Re-render when flow changes

  // Update settings without full re-render
  useEffect(() => {
    if (renditionRef.current) {
      renditionRef.current.themes.fontSize(`${fontSize}%`);
    }
  }, [fontSize]);

  useEffect(() => {
    if (renditionRef.current) {
      renditionRef.current.themes.select(theme);
    }
  }, [theme]);

  const next = () => renditionRef.current?.next();
  const prev = () => renditionRef.current?.prev();

  if (!bookUrl) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p>未找到书籍链接</p>
      </div>
    );
  }

  return (
    <div className="reader-container" style={{ backgroundColor: THEMES[theme].bg }}>
      {/* Header */}
      <div className="h-14 bg-white/80 backdrop-blur-md border-b border-black/5 flex items-center justify-between px-4 z-30">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-black/5 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          <h2 className="text-sm font-serif text-[#4a4a4a] truncate max-w-[200px] md:max-w-md">
            {bookTitle}
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setShowToc(!showToc);
              if (showSettings) setShowSettings(false);
            }}
            className={`p-2 hover:bg-black/5 rounded-full transition-colors ${showToc ? 'bg-black/5' : ''}`}
            title="目录"
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
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>
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
                    <li key={item.id}>
                      <button
                        onClick={() => {
                          renditionRef.current?.display(item.href);
                          if (window.innerWidth < 768) setShowToc(false);
                        }}
                        className="text-left text-base md:text-sm text-[#4a4a4a]/80 hover:text-[#8b7e66] hover:bg-[#fdfaf6] transition-all w-full py-3 md:py-2 px-3 rounded-lg"
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
                className="fixed inset-x-0 bottom-0 md:absolute md:inset-auto md:right-4 md:top-4 w-full md:w-72 bg-white border-t md:border border-black/5 z-50 md:z-40 rounded-t-3xl md:rounded-2xl shadow-2xl p-6 space-y-8 md:!translate-y-0"
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-serif text-lg text-[#4a4a4a]">阅读设置</h3>
                  <button onClick={() => setShowSettings(false)} className="p-2 hover:bg-black/5 rounded-full">
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

            {/* Flow Mode */}
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
              <Loader2 className="w-8 h-8 animate-spin text-[#8b7e66]" />
            </div>
          )}
          
          <div className="relative w-full max-w-4xl h-full flex items-center justify-center">
            {/* Navigation Controls (Only for paginated) */}
            {flow === "paginated" && (
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

            <div 
              ref={viewerRef} 
              className={`epub-viewer w-full h-full mx-auto px-4 md:px-16 ${flow === "scrolled" ? 'overflow-y-auto' : ''}`} 
            />

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
      <div className="md:hidden h-16 bg-white/80 backdrop-blur-md border-t border-black/5 flex items-center justify-around">
        <button onClick={prev} className="p-4">
          <ChevronLeft className="w-6 h-6" />
        </button>
        <div className="text-[10px] text-[#8b7e66] opacity-50">
          {flow === "paginated" ? "点击左右侧翻页" : "上下滑动阅读"}
        </div>
        <button onClick={next} className="p-4">
          <ChevronRight className="w-6 h-6" />
        </button>
      </div>
    </div>
  );
}
