import React from "react";
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from "react-router-dom";
import { Library, Upload, Settings as SettingsIcon, BookOpen, Github } from "lucide-react";
import BookShelf from "./components/BookShelf";
import Reader from "./components/Reader";
import Uploader from "./components/Uploader";
import Settings from "./components/Settings";
import Toast from "./components/Toast";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

function Navigation() {
  const location = useLocation();
  
  // Hide navigation in reader mode
  if (location.pathname === "/reader") return null;

  const navItems = [
    { path: "/", icon: Library, label: "书架" },
    { path: "/upload", icon: Upload, label: "上传" },
    { path: "/settings", icon: SettingsIcon, label: "设置" },
  ];

  return (
    <nav className="fixed bottom-4 left-4 right-4 md:left-1/2 md:right-auto md:-translate-x-1/2 bg-white/90 backdrop-blur-xl border border-[#8b7e66]/10 px-6 py-3 rounded-full shadow-2xl z-50 flex items-center justify-around md:justify-center md:gap-8">
      {navItems.map((item) => {
        const isActive = location.pathname === item.path;
        return (
          <Link
            key={item.path}
            to={item.path}
            className={cn(
              "flex flex-col items-center gap-1 transition-all duration-300 min-w-[60px]",
              isActive ? "text-[#8b7e66] scale-110" : "text-[#8b7e66]/40 hover:text-[#8b7e66]/70"
            )}
          >
            <item.icon className="w-5 h-5" />
            <span className="text-[10px] font-medium">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

function Header() {
  const location = useLocation();
  if (location.pathname === "/reader") return null;

  return (
    <header className="py-4 md:py-6 px-4 md:px-8 flex items-center justify-between">
      <Link to="/" className="flex items-center gap-2 group">
        <div className="w-8 h-8 md:w-10 md:h-10 bg-[#8b7e66] rounded-lg md:rounded-xl flex items-center justify-center shadow-lg shadow-[#8b7e66]/20 group-hover:rotate-6 transition-transform">
          <BookOpen className="w-5 h-5 md:w-6 md:h-6 text-white" />
        </div>
        <span className="text-lg md:text-xl font-serif font-bold tracking-tight text-[#4a4a4a]">墨香书阁</span>
      </Link>

      <a
        href="https://github.com/shalom-lab/bookhub"
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2 px-3 py-1.5 md:px-4 md:py-2 bg-[#fdfaf6] border border-[#8b7e66]/10 rounded-full text-[#8b7e66]/60 hover:text-[#8b7e66] hover:bg-white hover:shadow-sm transition-all duration-300 group"
      >
        <Github className="w-3.5 h-3.5 md:w-4 md:h-4 group-hover:rotate-12 transition-transform" />
        <span className="text-[10px] md:text-xs font-serif tracking-wider font-medium">GitHub</span>
      </a>
    </header>
  );
}

export default function App() {
  return (
    <Router basename={import.meta.env.BASE_URL}>
      <Toast />
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 pb-24">
          <Routes>
            <Route path="/" element={<BookShelf />} />
            <Route path="/reader" element={<Reader />} />
            <Route path="/upload" element={<Uploader />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </main>
        <Navigation />
      </div>
    </Router>
  );
}
