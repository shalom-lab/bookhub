import React, { useEffect, useRef, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Rendition } from "epubjs";
import { X, Settings, List, Loader2, Minus, Plus, Type, Palette, MousePointer2, Maximize2, Minimize2, BookOpen, ChevronLeft, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import EpubViewer from "./EpubViewer";
import PdfViewer from "./PdfViewer";

const THEMES = {
  default: { name: "默认", bg: "#fdfaf6", fg: "#4a4a4a" },
  parchment: { name: "羊皮纸", bg: "#f4ecd8", fg: "#5b4636" },
  green: { name: "护眼绿", bg: "#c7edcc", fg: "#2c3e50" },
  dark: { name: "夜间", bg: "#1a1a1a", fg: "#d1d1d1" },
};

export default function Reader() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const bookUrl = searchParams.get("url");
  const bookTitle = searchParams.get("title") || "阅读器";
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toc, setToc] = useState<any[]>([]);
  const [showToc, setShowToc] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  
  const [theme, setTheme] = useState<keyof typeof THEMES>(() => 
    (localStorage.getItem("reader_theme") as keyof typeof THEMES) || "default"
  );
  const [fontSize, setFontSize] = useState(() => 
    parseInt(localStorage.getItem("reader_font_size") || "100", 10)
  );
  const [flow, setFlow] = useState<"paginated" | "scrolled">(() => 
    (localStorage.getItem("reader_flow") as "paginated" | "scrolled") || "paginated"
  );
  const [spread, setSpread] = useState<"auto" | "none">(() => 
    (localStorage.getItem("reader_spread") as "auto" | "none") || "auto"
  );
  
  const [epubPercentage, setEpubPercentage] = useState(0);
  const [showControls, setShowControls] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  const renditionRef = useRef<Rendition | null>(null);
  const isPdf = bookUrl?.split('?')[0].toLowerCase().endsWith(".pdf");

  useEffect(() => {
    localStorage.setItem("reader_theme", theme);
    localStorage.setItem("reader_font_size", fontSize.toString());
    localStorage.setItem("reader_flow", flow);
    localStorage.setItem("reader_spread", spread);
  }, [theme, fontSize, flow, spread]);

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

  const next = () => {
    if (!isPdf) renditionRef.current?.next();
  };

  const prev = () => {
    if (!isPdf) renditionRef.current?.prev();
  };

  if (!bookUrl) return <div className="flex items-center justify-center h-screen"><p>未找到书籍链接</p></div>;

  return (
    <div className="reader-container h-screen flex flex-col overflow-hidden" style={{ backgroundColor: isPdf ? "#323639" : THEMES[theme].bg }}>
      {/* Header */}
      <AnimatePresence>
        {showControls && (
          <motion.div 
            initial={{ y: -60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -60, opacity: 0 }}
            className="h-14 backdrop-blur-md border-b flex items-center justify-between px-4 z-40 fixed top-0 left-0 right-0"
            style={{ 
              backgroundColor: isPdf ? "rgba(50, 54, 57, 0.9)" : `${THEMES[theme].bg}CC`, 
              borderColor: isPdf ? "rgba(255,255,255,0.1)" : (theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'),
              color: isPdf ? "#fff" : THEMES[theme].fg 
            }}
          >
            <div className="flex items-center gap-4">
              <button onClick={() => navigate(-1)} className="p-2 hover:bg-white/10 rounded-full"><X className="w-5 h-5" /></button>
              <h2 className="text-sm font-serif truncate max-w-[150px] md:max-w-md">{bookTitle}</h2>
            </div>
            <div className="flex items-center gap-1 md:gap-2">
              <button onClick={toggleFullscreen} className="p-2 hover:bg-white/10 rounded-full">{isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}</button>
              {!isPdf && (
                <>
                  <button onClick={() => { setShowToc(!showToc); setShowSettings(false); }} className={`p-2 hover:bg-black/5 rounded-full ${showToc ? 'bg-black/5' : ''}`}><List className="w-5 h-5" /></button>
                  <button onClick={() => { setShowSettings(!showSettings); setShowToc(false); }} className={`p-2 hover:bg-black/5 rounded-full ${showSettings ? 'bg-black/5' : ''}`}><Settings className="w-5 h-5" /></button>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="fixed top-0 left-0 right-0 h-0.5 z-50">
        {!isPdf && (
          <div className="h-full bg-[#8b7e66] transition-all duration-300" style={{ width: `${epubPercentage}%`, opacity: showControls ? 1 : 0.3 }} />
        )}
      </div>

      <div className={`flex-1 flex overflow-hidden ${isPdf ? 'pt-0' : 'pt-14'}`}>
        <div className="flex-1 relative overflow-hidden flex flex-col" style={{ backgroundColor: isPdf ? "#323639" : THEMES[theme].bg }}>
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center z-50" style={{ backgroundColor: isPdf ? "#323639" : THEMES[theme].bg }}>
              <div className="flex flex-col items-center gap-4">
                <Loader2 className="w-8 h-8 animate-spin text-[#8b7e66]" />
                <p className="text-sm text-[#8b7e66] font-serif">正在准备书籍...</p>
              </div>
            </div>
          )}
          {error && (
            <div className="absolute inset-0 flex items-center justify-center z-50 px-6 text-center" style={{ backgroundColor: isPdf ? "#323639" : THEMES[theme].bg }}>
              <div className="max-w-xs space-y-4">
                <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mx-auto"><X className="w-6 h-6 text-red-500" /></div>
                <p className="text-[var(--text-color)] font-serif">{error}</p>
                <button onClick={() => window.location.reload()} className="px-6 py-2 bg-[var(--primary-color)] text-white rounded-full text-sm">重试</button>
              </div>
            </div>
          )}

          <div className="flex-1 w-full relative">
            {isPdf ? (
              <PdfViewer 
                bookUrl={bookUrl} 
                onLoading={setLoading} 
                onError={setError}
              />
            ) : (
              <EpubViewer 
                bookUrl={bookUrl} theme={theme} fontSize={fontSize} flow={flow} spread={spread} 
                themes={THEMES} renditionRef={renditionRef}
                onTocLoaded={setToc} onLocationChanged={setEpubPercentage} 
                onLoading={setLoading} onError={setError}
              />
            )}
          </div>
        </div>
      </div>

      {/* TOC Sidebar */}
      <AnimatePresence>
        {showToc && !isPdf && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowToc(false)} className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40" />
            <motion.div initial={{ x: "-100%" }} animate={{ x: 0 }} exit={{ x: "-100%" }} className="fixed inset-y-0 left-0 w-full md:w-80 bg-white shadow-2xl z-50 flex flex-col p-6" style={{ backgroundColor: THEMES[theme].bg, color: THEMES[theme].fg }}>
              <div className="flex items-center justify-between mb-8"><h3 className="font-serif text-xl">目录</h3><button onClick={() => setShowToc(false)} className="p-2 hover:bg-black/5 rounded-full"><X className="w-6 h-6" /></button></div>
              <ul className="space-y-1 flex-1 overflow-y-auto">
                {toc.map((item) => (
                  <li key={item.id || item.href}>
                    <button onClick={() => { renditionRef.current?.display(item.href); if (window.innerWidth < 768) setShowToc(false); }} className="text-left text-sm hover:text-[#8b7e66] hover:bg-black/5 transition-all w-full py-2 px-3 rounded-lg" style={{ color: THEMES[theme].fg }}>{item.label}</button>
                  </li>
                ))}
              </ul>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Settings Panel */}
      <AnimatePresence>
        {showSettings && !isPdf && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowSettings(false)} className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 md:hidden" />
            <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} className="fixed inset-x-0 bottom-0 md:absolute md:inset-auto md:right-4 md:top-4 w-full md:w-72 border-t md:border z-50 md:z-40 rounded-t-3xl md:rounded-2xl shadow-2xl p-6 space-y-8 md:!translate-y-0" style={{ backgroundColor: THEMES[theme].bg, color: THEMES[theme].fg, borderColor: theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }}>
              <div className="flex items-center justify-between"><h3 className="font-serif text-lg">阅读设置</h3><button onClick={() => setShowSettings(false)} className="p-2 hover:bg-black/5 rounded-full"><X className="w-5 h-5 md:w-4 md:h-4" /></button></div>
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-xs text-[#8b7e66] uppercase tracking-wider font-medium"><Type className="w-3 h-3" />字体大小</div>
                <div className="flex items-center justify-between bg-black/5 p-1 rounded-full"><button onClick={() => setFontSize(Math.max(50, fontSize - 10))} className="p-2"><Minus className="w-4 h-4" /></button><span>{fontSize}%</span><button onClick={() => setFontSize(Math.min(200, fontSize + 10))} className="p-2"><Plus className="w-4 h-4" /></button></div>
              </div>
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-xs text-[#8b7e66] uppercase tracking-wider font-medium"><Palette className="w-3 h-3" />阅读主题</div>
                <div className="grid grid-cols-2 gap-2">{Object.entries(THEMES).map(([key, value]) => (<button key={key} onClick={() => setTheme(key as keyof typeof THEMES)} className={`p-2 rounded-xl border ${theme === key ? 'border-[#8b7e66]' : 'border-transparent'}`}><div className="w-full h-8 rounded-md" style={{ backgroundColor: value.bg }} /><span className="text-[10px]">{value.name}</span></button>))}</div>
              </div>
              <div className="space-y-3"><div className="flex items-center gap-2 text-xs text-[#8b7e66] uppercase tracking-wider font-medium"><MousePointer2 className="w-3 h-3" />翻页</div>
              <div className="flex bg-black/5 p-1 rounded-xl"><button onClick={() => setFlow("paginated")} className={`flex-1 py-1 text-xs rounded-lg ${flow === "paginated" ? 'bg-white shadow-sm' : ''}`}>翻页</button><button onClick={() => setFlow("scrolled")} className={`flex-1 py-1 text-xs rounded-lg ${flow === "scrolled" ? 'bg-white shadow-sm' : ''}`}>滚动</button></div></div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Mobile Controls */}
      <AnimatePresence>
        {showControls && !isPdf && (
          <motion.div initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 60, opacity: 0 }} className="md:hidden h-16 backdrop-blur-md border-t flex items-center justify-around fixed bottom-0 left-0 right-0 z-40" style={{ backgroundColor: `${THEMES[theme].bg}CC`, borderColor: theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)', color: THEMES[theme].fg }}>
            <button onClick={prev} className="p-4"><ChevronLeft className="w-6 h-6" /></button>
            <div className="text-[10px] opacity-50 font-serif">{flow === "paginated" ? "点击侧边翻页" : "滚动阅读"}</div>
            <button onClick={next} className="p-4"><ChevronRight className="w-6 h-6" /></button>
          </motion.div>
        )}
      </AnimatePresence>
      {!isPdf && <div className="fixed inset-x-0 top-1/4 bottom-1/4 z-0" onClick={() => setShowControls(!showControls)} />}
    </div>
  );
}
