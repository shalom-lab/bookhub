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

  useEffect(() => {
    localStorage.setItem("reader_theme", theme);
    localStorage.setItem("reader_font_size", fontSize.toString());
    if (rendition) {
      Object.entries(THEMES).forEach(([key, value]) => {
        rendition.themes.register(key, { body: { background: `${value.bg} !important`, color: `${value.fg} !important` } });
      });
      rendition.themes.select(theme);
      rendition.themes.fontSize(`${fontSize}%`);
    }
  }, [rendition, theme, fontSize]);

  const currentTheme = THEMES[theme] || THEMES.light;
  const readerStyles = {
    ...ReactReaderStyle,
    readerArea: { ...ReactReaderStyle.readerArea, backgroundColor: currentTheme.bg },
    titleArea: { display: 'none' }
  };

  return (
    <div className="h-screen w-full flex flex-col relative overflow-hidden" style={{ backgroundColor: currentTheme.bg }}>
      <div className="h-14 flex items-center justify-between px-4 border-b">
        <button onClick={() => navigate(-1)} style={{ color: currentTheme.fg }}><ArrowLeft /></button>
        <h1 className="font-serif font-bold truncate" style={{ color: currentTheme.fg }}>{bookTitle}</h1>
        <button onClick={() => setShowSettings(!showSettings)} style={{ color: currentTheme.fg }}><Settings /></button>
      </div>

      <div className="flex-1 relative">
        {loading && <div className="absolute inset-0 z-50 flex items-center justify-center"><Loader2 className="animate-spin" /></div>}
        {error && <div className="absolute inset-0 z-50 flex items-center justify-center text-red-500">{error}</div>}
        {!loading && bookData && (
          <ReactReader
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
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-40 bg-black/20" onClick={() => setShowSettings(false)} />
            <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} className="absolute bottom-0 left-0 right-0 z-50 bg-white p-8 rounded-t-3xl shadow-2xl" style={{ backgroundColor: currentTheme.bg, color: currentTheme.fg }}>
              <div className="flex justify-between mb-8"><h3>阅读设置</h3><button onClick={() => setShowSettings(false)}><X /></button></div>
              <div className="mb-6">
                <h4>字号</h4>
                <div className="flex gap-4 items-center bg-black/5 p-2 rounded-xl">
                  <button onClick={() => setFontSize(fontSize - 10)}><Minus /></button>
                  <span>{fontSize}%</span>
                  <button onClick={() => setFontSize(fontSize + 10)}><Plus /></button>
                </div>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {Object.entries(THEMES).map(([key, value]) => (
                  <button key={key} onClick={() => setTheme(key as any)} className="flex flex-col items-center">
                    <div className="w-8 h-8 rounded-full border" style={{ backgroundColor: value.bg }} />
                    <span className="text-[10px]">{value.name}</span>
                  </button>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
