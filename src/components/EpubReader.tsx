import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ReactReader, ReactReaderStyle } from "react-reader";
import { getBookOffline, saveBookOffline } from "../lib/offline";
import { X, Settings, Loader2, Minus, Plus, ArrowLeft } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

const THEMES = {
  light: { name: "纯净白", bg: "#FFFFFF", fg: "#333333" },
  sepia: { name: "羊皮纸", bg: "#FBF0D9", fg: "#5F4B32" },
  green: { name: "护眼绿", bg: "#E1EAD8", fg: "#2C3E50" },
  dark: { name: "极夜黑", bg: "#121212", fg: "#D1D1D1" },
};

interface EpubReaderProps {
  bookUrl: string;
  bookTitle: string;
}

export default function EpubReader({ bookUrl, bookTitle }: EpubReaderProps) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bookData, setBookData] = useState<string | ArrayBuffer | null>(null);
  const [location, setLocation] = useState<string | number>(localStorage.getItem(`read_pos_${bookUrl}`) || 0);
  const [showSettings, setShowSettings] = useState(false);
  const [theme, setTheme] = useState<keyof typeof THEMES>((localStorage.getItem("reader_theme") as any) || "light");
  const [fontSize, setFontSize] = useState(parseInt(localStorage.getItem("reader_font_size") || "110", 10));
  const [rendition, setRendition] = useState<any>(null);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const offlineBuffer = await getBookOffline(bookUrl);
        if (offlineBuffer) {
          setBookData(offlineBuffer);
        } else {
          const response = await fetch(bookUrl);
          const buffer = await response.arrayBuffer();
          await saveBookOffline(bookUrl, buffer);
          setBookData(buffer);
        }
        setLoading(false);
      } catch (err: any) {
        setError(err.message);
        setLoading(false);
      }
    };
    loadData();
  }, [bookUrl]);

  // 改进的主题应用逻辑
  useEffect(() => {
    localStorage.setItem("reader_theme", theme);
    localStorage.setItem("reader_font_size", fontSize.toString());
    
    if (rendition) {
      // 1. 注册所有主题
      Object.entries(THEMES).forEach(([key, value]) => {
        rendition.themes.register(key, {
          body: {
            "background-color": value.bg, // 不再强制使用 !important
            "color": value.fg,
            "font-family": "system-ui, -apple-system, sans-serif",
          }
        });
      });
      
      // 2. 选择当前主题
      rendition.themes.select(theme);
      
      // 3. 针对深色模式做额外的强制背景覆盖，防止残留
      if (theme === 'dark') {
        rendition.themes.override('background-color', '#121212', 'important');
      } else {
        rendition.themes.override('background-color', THEMES[theme].bg, 'important');
      }
      
      rendition.themes.fontSize(`${fontSize}%`);
    }
  }, [rendition, theme, fontSize]);

  const currentTheme = THEMES[theme] || THEMES.light;
  
  // 确保 ReactReader 容器样式也同步更新
  const readerStyles = {
    ...ReactReaderStyle,
    readerArea: { 
      ...ReactReaderStyle.readerArea, 
      backgroundColor: currentTheme.bg,
      transition: "background-color 0.3s ease" 
    },
    titleArea: { display: 'none' },
    arrow: {
      ...ReactReaderStyle.arrow,
      color: currentTheme.fg,
      opacity: 0.5
    }
  };

  return (
    <div 
      className="h-screen w-full flex flex-col relative overflow-hidden transition-colors duration-300" 
      style={{ backgroundColor: currentTheme.bg }}
    >
      <div 
        className="h-14 flex items-center justify-between px-4 border-b"
        style={{ borderColor: theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }}
      >
        <button onClick={() => navigate(-1)} style={{ color: currentTheme.fg }}><ArrowLeft /></button>
        <h1 className="font-serif font-bold truncate px-4" style={{ color: currentTheme.fg }}>{bookTitle}</h1>
        <button onClick={() => setShowSettings(!showSettings)} style={{ color: currentTheme.fg }}><Settings /></button>
      </div>

      <div className="flex-1 relative">
        {loading && <div className="absolute inset-0 z-50 flex items-center justify-center"><Loader2 className="animate-spin" /></div>}
        {error && <div className="absolute inset-0 z-50 flex items-center justify-center text-red-500">{error}</div>}
        {!loading && bookData && (
          <ReactReader
            key={`${theme}-${fontSize}`} // 增加 key 值，确保在重大主题切换时组件能感知更新
            url={bookData}
            location={location}
            locationChanged={(loc) => { setLocation(loc); localStorage.setItem(`read_pos_${bookUrl}`, String(loc)); }}
            readerStyles={readerStyles}
            getRendition={(rend) => setRendition(rend)}
          />
        )}
      </div>

      <AnimatePresence>
        {showSettings && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-40 bg-black/20 backdrop-blur-sm" onClick={() => setShowSettings(false)} />
            <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} className="absolute bottom-0 left-0 right-0 z-50 p-8 rounded-t-3xl shadow-2xl" style={{ backgroundColor: currentTheme.bg, color: currentTheme.fg }}>
              <div className="flex justify-between mb-8 items-center"><h3 className="font-bold">阅读设置</h3><button onClick={() => setShowSettings(false)} className="p-2 hover:bg-black/5 rounded-full"><X /></button></div>
              <div className="mb-8">
                <h4 className="text-xs opacity-50 mb-3">字号调节</h4>
                <div className="flex gap-4 items-center bg-black/5 p-2 rounded-2xl">
                  <button onClick={() => setFontSize(Math.max(70, fontSize - 10))} className="p-2 hover:bg-black/5 rounded-lg"><Minus className="w-5 h-5" /></button>
                  <span className="flex-1 text-center font-bold">{fontSize}%</span>
                  <button onClick={() => setFontSize(Math.min(200, fontSize + 10))} className="p-2 hover:bg-black/5 rounded-lg"><Plus className="w-5 h-5" /></button>
                </div>
              </div>
              <div>
                <h4 className="text-xs opacity-50 mb-3">配色方案</h4>
                <div className="grid grid-cols-4 gap-4">
                  {Object.entries(THEMES).map(([key, value]) => (
                    <button key={key} onClick={() => setTheme(key as any)} className={`flex flex-col items-center gap-2 transition-transform ${theme === key ? 'scale-110' : 'opacity-60'}`}>
                      <div className={`w-10 h-10 rounded-full border-2 ${theme === key ? 'border-[var(--primary-color)]' : 'border-transparent'}`} style={{ backgroundColor: value.bg }} />
                      <span className="text-[10px]">{value.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
