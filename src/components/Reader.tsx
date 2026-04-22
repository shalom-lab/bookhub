import React, { useEffect, useRef, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import ePub, { Rendition } from "epubjs";
import { getBookOffline, saveBookOffline } from "../lib/offline";
import { 
  X, Settings, List, Loader2, Minus, Plus, Type, 
  Palette, MousePointer2, ChevronLeft, ChevronRight,
  BookOpen, AlignLeft
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

const THEMES = {
  light: { name: "纯净白", bg: "#FFFFFF", fg: "#333333", selection: "rgba(0,0,0,0.1)" },
  sepia: { name: "羊皮纸", bg: "#FBF0D9", fg: "#5F4B32", selection: "rgba(95,75,50,0.2)" },
  green: { name: "护眼绿", bg: "#E1EAD8", fg: "#2C3E50", selection: "rgba(44,62,80,0.2)" },
  dark: { name: "极夜黑", bg: "#121212", fg: "#D1D1D1", selection: "rgba(255,255,255,0.2)" },
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
  const [progress, setProgress] = useState(0);
  const [locationStr, setLocationStr] = useState("");
  
  // UI State
  const [showUI, setShowUI] = useState(true);
  const [activePanel, setActivePanel] = useState<"none" | "toc" | "settings">("none");
  
  // Settings State
  const [theme, setTheme] = useState<keyof typeof THEMES>(() => 
    (localStorage.getItem("reader_theme") as keyof typeof THEMES) || "light"
  );
  const [fontSize, setFontSize] = useState(() => 
    parseInt(localStorage.getItem("reader_font_size") || "110", 10)
  );
  const [flow, setFlow] = useState<"paginated" | "scrolled">(() => 
    (localStorage.getItem("reader_flow") as "paginated" | "scrolled") || "paginated"
  );

  // Initialize EPUB
  useEffect(() => {
    if (!bookUrl || !viewerRef.current) return;

    let book: any;
    let isMounted = true;

    const initEpub = async () => {
      setLoading(true);
      setError(null);
      try {
        let bookData: any = bookUrl;
        
        const offlineBuffer = await getBookOffline(bookUrl);
        if (offlineBuffer) {
          bookData = offlineBuffer;
        } else {
          const response = await fetch(bookUrl);
          if (!response.ok) throw new Error(`下载失败: ${response.status}`);
          const buffer = await response.arrayBuffer();
          await saveBookOffline(bookUrl, buffer);
          bookData = buffer;
        }

        if (!isMounted) return;

        book = ePub(bookData);
        
        // Premium Layout configuration
        const rendition = book.renderTo(viewerRef.current!, {
          width: "100%",
          height: "100%",
          flow: flow,
          manager: flow === "scrolled" ? "continuous" : "default",
          spread: "none", // Force single column for modern mobile-first look, or auto for desktop
          snap: true,
        });

        renditionRef.current = rendition;

        // Register beautiful themes
        Object.entries(THEMES).forEach(([key, value]) => {
          rendition.themes.register(key, {
            body: {
              background: `${value.bg} !important`,
              color: `${value.fg} !important`,
              "font-family": "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'Noto Sans', sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol', 'Noto Color Emoji' !important",
              "line-height": "1.8 !important",
              "padding": window.innerWidth < 768 ? "20px 16px !important" : "40px 60px !important",
              "transition": "color 0.3s ease, background-color 0.3s ease",
            },
            "p": {
              "margin-bottom": "1.2em !important",
              "font-size": "1em !important",
            },
            "h1, h2, h3, h4, h5, h6": {
              color: `${value.fg} !important`,
              "font-family": "'Noto Serif SC', 'Source Han Serif SC', serif !important",
              "font-weight": "600 !important",
              "line-height": "1.4 !important",
              "margin-top": "2em !important",
              "margin-bottom": "1em !important",
            },
            "::selection": {
              background: `${value.selection} !important`,
            }
          });
        });

        rendition.themes.select(theme);
        rendition.themes.fontSize(`${fontSize}%`);

        const savedLocation = localStorage.getItem(`read_pos_${bookUrl}`);
        await rendition.display(savedLocation || undefined);
        
        if (!isMounted) return;
        setLoading(false);

        book.ready.then(() => {
          return book.locations.generate(1600);
        }).then((locations: any) => {
          // Ready for progress calculation
        });

        book.loaded.navigation.then((nav: any) => {
          if (isMounted) setToc(nav.toc);
        });

        rendition.on("relocated", (location: any) => {
          if (!isMounted) return;
          localStorage.setItem(`read_pos_${bookUrl}`, location.start.cfi);
          if (book.locations.length() > 0) {
            const percentage = book.locations.percentageFromCfi(location.start.cfi);
            setProgress(Math.round(percentage * 100));
          }
          // Format location string cleanly
          if (location.start.displayed) {
            setLocationStr(`页 ${location.start.displayed.page}`);
          }
        });

      } catch (err: any) {
        console.error("EPUB Error:", err);
        if (isMounted) {
          setError(err.message || "书籍加载失败");
          setLoading(false);
        }
      }
    };

    initEpub();

    return () => {
      isMounted = false;
      if (book) book.destroy();
    };
  }, [bookUrl, flow]); // Re-init on flow change

  // Keyboard Navigation
  useEffect(() => {
    const handleKeydown = (e: KeyboardEvent) => {
      if (!renditionRef.current || activePanel !== "none") return;
      if (e.key === "ArrowLeft") renditionRef.current.prev();
      if (e.key === "ArrowRight") renditionRef.current.next();
      if (e.key === "Escape") setShowUI(!showUI);
    };
    window.addEventListener("keydown", handleKeydown);
    return () => window.removeEventListener("keydown", handleKeydown);
  }, [activePanel, showUI]);

  // Sync Settings without re-init
  useEffect(() => {
    localStorage.setItem("reader_theme", theme);
    localStorage.setItem("reader_font_size", fontSize.toString());
    localStorage.setItem("reader_flow", flow);
    
    if (renditionRef.current) {
      renditionRef.current.themes.select(theme);
      renditionRef.current.themes.fontSize(`${fontSize}%`);
    }
  }, [theme, fontSize, flow]);

  if (!bookUrl) return <div className="flex items-center justify-center h-screen bg-[#fdfaf6]">未找到书籍</div>;

  const currentTheme = THEMES[theme];

  return (
    <div 
      className="h-screen w-full flex flex-col relative overflow-hidden transition-colors duration-500 ease-in-out" 
      style={{ backgroundColor: currentTheme.bg, color: currentTheme.fg }}
    >
      {/* Background Texture for specific themes */}
      {theme === 'sepia' && <div className="absolute inset-0 opacity-[0.03] pointer-events-none book-texture" />}

      {/* Main EPUB Canvas container */}
      <div className="flex-1 relative w-full h-full">
        {/* The Viewer */}
        <div 
          ref={viewerRef} 
          className="absolute inset-0 z-0" 
        />
        
        {/* Invisible Click Zones for Navigation & UI Reveal */}
        <div className="absolute inset-0 z-10 flex">
          <div className="w-1/4 h-full cursor-pointer" onClick={() => flow === 'paginated' && renditionRef.current?.prev()} />
          <div className="w-2/4 h-full cursor-pointer" onClick={() => { setShowUI(!showUI); setActivePanel("none"); }} />
          <div className="w-1/4 h-full cursor-pointer" onClick={() => flow === 'paginated' && renditionRef.current?.next()} />
        </div>

        {/* Loading State */}
        <AnimatePresence>
          {loading && (
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 z-50 flex flex-col items-center justify-center backdrop-blur-sm"
              style={{ backgroundColor: `${currentTheme.bg}CC` }}
            >
              <Loader2 className="w-8 h-8 animate-spin mb-4 opacity-50" />
              <p className="text-sm tracking-widest font-serif opacity-60">加载中...</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Error State */}
        {error && (
          <div className="absolute inset-0 z-50 flex items-center justify-center">
            <div className="bg-red-50 text-red-500 px-6 py-4 rounded-2xl shadow-xl flex flex-col items-center gap-3">
              <X className="w-8 h-8" />
              <p className="font-medium">{error}</p>
              <button onClick={() => window.location.reload()} className="px-4 py-2 bg-red-500 text-white rounded-lg text-sm">刷新重试</button>
            </div>
          </div>
        )}
      </div>

      {/* Top Navigation Bar (Premium Glassmorphism) */}
      <AnimatePresence>
        {showUI && (
          <motion.div 
            initial={{ y: -100, opacity: 0 }} 
            animate={{ y: 0, opacity: 1 }} 
            exit={{ y: -100, opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="absolute top-0 left-0 right-0 z-40 px-4 py-4 md:px-8"
          >
            <div 
              className="max-w-4xl mx-auto flex items-center justify-between px-6 py-3 rounded-full shadow-lg backdrop-blur-xl border"
              style={{ 
                backgroundColor: `${currentTheme.bg}D9`,
                borderColor: theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' 
              }}
            >
              <button 
                onClick={() => navigate(-1)} 
                className="p-2 -ml-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
              
              <h1 className="text-sm md:text-base font-serif font-medium tracking-wide truncate max-w-[200px] md:max-w-md opacity-80">
                {bookTitle}
              </h1>
              
              <div className="flex items-center gap-1 -mr-2">
                <button 
                  onClick={() => setActivePanel(activePanel === "toc" ? "none" : "toc")} 
                  className={`p-2 rounded-full transition-colors ${activePanel === "toc" ? 'bg-black/5 dark:bg-white/10' : 'hover:bg-black/5 dark:hover:bg-white/10'}`}
                >
                  <List className="w-5 h-5" />
                </button>
                <button 
                  onClick={() => setActivePanel(activePanel === "settings" ? "none" : "settings")} 
                  className={`p-2 rounded-full transition-colors ${activePanel === "settings" ? 'bg-black/5 dark:bg-white/10' : 'hover:bg-black/5 dark:hover:bg-white/10'}`}
                >
                  <Settings className="w-5 h-5" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom Progress Bar */}
      <AnimatePresence>
        {showUI && !loading && (
          <motion.div 
            initial={{ y: 100, opacity: 0 }} 
            animate={{ y: 0, opacity: 1 }} 
            exit={{ y: 100, opacity: 0 }}
            className="absolute bottom-6 left-0 right-0 z-30 px-6 flex justify-center pointer-events-none"
          >
            <div className="flex flex-col items-center gap-2">
              <span className="text-[10px] font-medium tracking-widest opacity-40 uppercase">
                {progress}% {locationStr ? `· ${locationStr}` : ''}
              </span>
              <div className="w-32 h-1 bg-black/5 dark:bg-white/10 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-current opacity-30 transition-all duration-500 ease-out" 
                  style={{ width: `${progress}%` }} 
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* TOC Panel */}
      <AnimatePresence>
        {activePanel === "toc" && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 z-40 bg-black/20 backdrop-blur-sm"
              onClick={() => setActivePanel("none")}
            />
            <motion.div 
              initial={{ x: "-100%" }} animate={{ x: 0 }} exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="absolute top-0 bottom-0 left-0 w-full md:w-96 z-50 shadow-2xl flex flex-col"
              style={{ backgroundColor: currentTheme.bg }}
            >
              <div className="px-8 py-6 border-b" style={{ borderColor: theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }}>
                <h2 className="text-xl font-serif font-bold tracking-tight">目录</h2>
              </div>
              <ul className="flex-1 overflow-y-auto px-4 py-4 space-y-1">
                {toc.map((item) => (
                  <li key={item.id || item.href}>
                    <button 
                      onClick={() => {
                        renditionRef.current?.display(item.href);
                        if (window.innerWidth < 768) setActivePanel("none");
                      }}
                      className="w-full text-left px-4 py-3 rounded-xl text-sm opacity-70 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/10 transition-all truncate"
                    >
                      {item.label}
                    </button>
                  </li>
                ))}
                {toc.length === 0 && (
                  <div className="p-8 text-center opacity-40 text-sm">暂无目录数据</div>
                )}
              </ul>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Settings Panel (Premium iOS Style) */}
      <AnimatePresence>
        {activePanel === "settings" && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 z-40 bg-black/20 backdrop-blur-sm"
              onClick={() => setActivePanel("none")}
            />
            <motion.div 
              initial={{ y: "100%", scale: 0.95 }} 
              animate={{ y: 0, scale: 1 }} 
              exit={{ y: "100%", scale: 0.95 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="absolute bottom-0 left-0 right-0 md:left-1/2 md:-translate-x-1/2 md:bottom-8 md:w-[400px] z-50 rounded-t-3xl md:rounded-3xl shadow-2xl overflow-hidden border"
              style={{ 
                backgroundColor: currentTheme.bg,
                borderColor: theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' 
              }}
            >
              <div className="p-8 flex flex-col gap-8">
                {/* Mode Toggle */}
                <div className="bg-black/5 dark:bg-white/5 p-1.5 rounded-2xl flex relative">
                  <motion.div 
                    className="absolute inset-y-1.5 w-[calc(50%-6px)] bg-white dark:bg-[#2a2a2a] rounded-xl shadow-sm"
                    initial={false}
                    animate={{ x: flow === 'paginated' ? "4px" : "calc(100% + 8px)" }}
                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                  />
                  <button 
                    onClick={() => setFlow('paginated')}
                    className={`flex-1 py-3 text-sm font-medium relative z-10 flex items-center justify-center gap-2 transition-colors ${flow === 'paginated' ? 'opacity-100' : 'opacity-40'}`}
                  >
                    <BookOpen className="w-4 h-4" /> 翻页
                  </button>
                  <button 
                    onClick={() => setFlow('scrolled')}
                    className={`flex-1 py-3 text-sm font-medium relative z-10 flex items-center justify-center gap-2 transition-colors ${flow === 'scrolled' ? 'opacity-100' : 'opacity-40'}`}
                  >
                    <AlignLeft className="w-4 h-4" /> 滚动
                  </button>
                </div>

                {/* Typography */}
                <div>
                  <h4 className="text-xs font-medium uppercase tracking-widest opacity-40 mb-3 ml-1">字号排版</h4>
                  <div className="flex items-center gap-4 bg-black/5 dark:bg-white/5 p-2 rounded-2xl">
                    <button 
                      onClick={() => setFontSize(Math.max(70, fontSize - 10))}
                      className="w-12 h-12 flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/10 rounded-xl transition-colors"
                    >
                      <Type className="w-4 h-4" />
                    </button>
                    <div className="flex-1 text-center font-medium text-lg tracking-wider">
                      {fontSize}%
                    </div>
                    <button 
                      onClick={() => setFontSize(Math.min(200, fontSize + 10))}
                      className="w-12 h-12 flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/10 rounded-xl transition-colors"
                    >
                      <Type className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* Themes */}
                <div>
                  <h4 className="text-xs font-medium uppercase tracking-widest opacity-40 mb-3 ml-1">色彩主题</h4>
                  <div className="grid grid-cols-4 gap-3">
                    {Object.entries(THEMES).map(([key, value]) => (
                      <button
                        key={key}
                        onClick={() => setTheme(key as keyof typeof THEMES)}
                        className={`flex flex-col items-center gap-2 transition-all ${theme === key ? 'scale-110' : 'hover:scale-105 opacity-60'}`}
                      >
                        <div 
                          className={`w-12 h-12 rounded-full shadow-inner flex items-center justify-center border-2 ${theme === key ? 'border-current' : 'border-transparent'}`}
                          style={{ backgroundColor: value.bg, color: value.fg }}
                        >
                          {theme === key && <div className="w-1.5 h-1.5 rounded-full bg-current" />}
                        </div>
                        <span className="text-[10px] font-medium">{value.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
