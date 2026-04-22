import React, { useEffect, useState, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { getBookOffline, saveBookOffline } from "../lib/offline";
import { ReactReader, ReactReaderStyle } from "react-reader";
import PdfViewer from "./PdfViewer";
import { X, Settings, Loader2, Minus, Plus, Palette, ArrowLeft } from "lucide-react";
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
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bookData, setBookData] = useState<string | ArrayBuffer | null>(null);
  const [location, setLocation] = useState<string | number>(
    localStorage.getItem(`read_pos_${bookUrl}`) || 0
  );
  
  // Custom UI State
  const [showSettings, setShowSettings] = useState(false);
  const [theme, setTheme] = useState<keyof typeof THEMES>(() => {
    const saved = localStorage.getItem("reader_theme");
    if (saved === "default") return "light";
    if (saved === "parchment") return "sepia";
    return (saved as keyof typeof THEMES) || "light";
  });
  const [fontSize, setFontSize] = useState(() => 
    parseInt(localStorage.getItem("reader_font_size") || "110", 10)
  );

  const renditionRef = useRef<any>(null);

  // Load Book Data
  useEffect(() => {
    if (!bookUrl) return;

    let isMounted = true;
    const loadData = async () => {
      setLoading(true);
      try {
        const offlineBuffer = await getBookOffline(bookUrl);
        if (offlineBuffer) {
          if (isMounted) {
            setBookData(offlineBuffer);
            setLoading(false);
          }
        } else {
          const response = await fetch(bookUrl);
          if (!response.ok) throw new Error("下载失败");
          const buffer = await response.arrayBuffer();
          await saveBookOffline(bookUrl, buffer);
          if (isMounted) {
            setBookData(buffer);
            setLoading(false);
          }
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err.message || "加载失败");
          setLoading(false);
        }
      }
    };
    loadData();
    return () => { isMounted = false; };
  }, [bookUrl]);

  // Sync Settings to Rendition
  useEffect(() => {
    localStorage.setItem("reader_theme", theme);
    localStorage.setItem("reader_font_size", fontSize.toString());
    
    if (renditionRef.current) {
      renditionRef.current.themes.select(theme);
      renditionRef.current.themes.fontSize(`${fontSize}%`);
    }
  }, [theme, fontSize]);

  const locationChanged = (epubcifi: string | number) => {
    setLocation(epubcifi);
    localStorage.setItem(`read_pos_${bookUrl}`, String(epubcifi));
  };

  if (!bookUrl) return <div className="flex items-center justify-center h-screen bg-[#fdfaf6]">未找到书籍</div>;

  const currentTheme = THEMES[theme] || THEMES.light;

  // Customize ReactReader styles
  const readerStyles = {
    ...ReactReaderStyle,
    readerArea: {
      ...ReactReaderStyle.readerArea,
      backgroundColor: currentTheme.bg,
      transition: "background-color 0.3s",
    },
    titleArea: {
      ...ReactReaderStyle.titleArea,
      color: currentTheme.fg,
      display: 'none', // We hide the default title to provide our own header
    },
    tocArea: {
      ...ReactReaderStyle.tocArea,
      backgroundColor: currentTheme.bg,
      color: currentTheme.fg,
    },
    tocButtonExpanded: {
      ...ReactReaderStyle.tocButtonExpanded,
      background: currentTheme.bg,
      color: currentTheme.fg,
    },
    tocButtonBar: {
      ...ReactReaderStyle.tocButtonBar,
      background: currentTheme.fg,
    },
    arrow: {
      ...ReactReaderStyle.arrow,
      color: currentTheme.fg,
      opacity: 0.3,
    },
    arrowHover: {
      ...ReactReaderStyle.arrowHover,
      color: currentTheme.fg,
      opacity: 0.8,
    }
  };

  return (
    <div className="h-screen w-full flex flex-col relative overflow-hidden" style={{ backgroundColor: currentTheme.bg }}>
      
      {/* Custom Header (Replaces default ReactReader title area) */}
      <div className="h-14 md:h-16 flex items-center justify-between px-4 z-10 border-b shadow-sm relative transition-colors"
           style={{ backgroundColor: `${currentTheme.bg}E6`, borderColor: theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }}>
        <button 
          onClick={() => navigate(-1)} 
          className="flex items-center gap-2 p-2 hover:bg-black/5 dark:hover:bg-white/10 rounded-xl transition-colors"
          style={{ color: currentTheme.fg }}
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="text-sm font-medium hidden md:block">返回书架</span>
        </button>
        
        <h1 className="text-sm md:text-base font-serif font-bold tracking-wide truncate max-w-[200px] md:max-w-md"
            style={{ color: currentTheme.fg }}>
          {bookTitle}
        </h1>
        
        <div className="w-[84px] md:w-[104px] flex justify-end">
          <button 
            onClick={() => setShowSettings(!showSettings)} 
            className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
            style={{ color: currentTheme.fg }}
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Reader Area */}
      <div className="flex-1 relative">
        {loading && (
          <div className="absolute inset-0 z-50 flex flex-col items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin mb-4" style={{ color: currentTheme.fg }} />
          </div>
        )}
        
        {error && (
          <div className="absolute inset-0 z-50 flex items-center justify-center text-red-500">
            {error}
          </div>
        )}
        
        {!loading && !error && bookUrl && (
          bookUrl.toLowerCase().split('?')[0].endsWith('.pdf') ? (
            <div className="absolute inset-0 z-20">
              <PdfViewer bookUrl={bookUrl} />
            </div>
          ) : (
            bookData && (
              <div className="absolute inset-0" style={{ top: '-40px' }}> {/* Adjust for custom header */}
                <ReactReader
                  url={bookData}
                  title={bookTitle}
                  location={location}
                  locationChanged={locationChanged}
                  styles={readerStyles}
                  epubOptions={{
                    flow: "paginated",
                    manager: "default",
                  }}
                  getRendition={(rendition) => {
                    renditionRef.current = rendition;
                    // Register beautiful themes
                    Object.entries(THEMES).forEach(([key, value]) => {
                      rendition.themes.register(key, {
                        body: {
                          background: `${value.bg} !important`,
                          color: `${value.fg} !important`,
                          "font-family": "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'Noto Sans', sans-serif !important",
                          "line-height": "1.8 !important",
                        },
                        "h1, h2, h3, h4, h5, h6": {
                          color: `${value.fg} !important`,
                          "font-family": "'Noto Serif SC', 'Source Han Serif SC', serif !important",
                        },
                        "::selection": {
                          background: `${value.selection} !important`,
                        }
                      });
                    });
                    rendition.themes.select(theme);
                    rendition.themes.fontSize(`${fontSize}%`);
                  }}
                />
              </div>
            )
          )
        )}
      </div>


      {/* Settings Panel */}
      <AnimatePresence>
        {showSettings && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 z-40 bg-black/20 backdrop-blur-sm"
              onClick={() => setShowSettings(false)}
            />
            <motion.div 
              initial={{ y: "100%", scale: 0.95 }} 
              animate={{ y: 0, scale: 1 }} 
              exit={{ y: "100%", scale: 0.95 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="absolute bottom-0 left-0 right-0 md:left-1/2 md:-translate-x-1/2 md:bottom-8 md:w-[400px] z-50 rounded-t-3xl md:rounded-3xl shadow-2xl overflow-hidden border"
              style={{ 
                backgroundColor: currentTheme.bg,
                borderColor: theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
                color: currentTheme.fg
              }}
            >
              <div className="p-8 flex flex-col gap-8">
                <div className="flex items-center justify-between">
                  <h3 className="font-serif text-lg font-bold tracking-wide">阅读设置</h3>
                  <button onClick={() => setShowSettings(false)} className="p-2 hover:bg-black/5 rounded-full"><X className="w-5 h-5" /></button>
                </div>

                <div>
                  <h4 className="text-xs font-medium uppercase tracking-widest opacity-40 mb-3 ml-1">字号排版</h4>
                  <div className="flex items-center gap-4 bg-black/5 dark:bg-white/5 p-2 rounded-2xl">
                    <button 
                      onClick={() => setFontSize(Math.max(70, fontSize - 10))}
                      className="w-12 h-12 flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/10 rounded-xl transition-colors"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <div className="flex-1 text-center font-medium text-lg tracking-wider">
                      {fontSize}%
                    </div>
                    <button 
                      onClick={() => setFontSize(Math.min(200, fontSize + 10))}
                      className="w-12 h-12 flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/10 rounded-xl transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>

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
