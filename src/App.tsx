import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from "react-router-dom";
import { Library, Upload, Settings as SettingsIcon, BookOpen, Github, Moon, Sun } from "lucide-react";
import BookShelf from "./components/BookShelf";
import Reader from "./components/Reader";
import Uploader from "./components/Uploader";
import Settings from "./components/Settings";
import Toast from "./components/Toast";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

import logo from "./images/logo.svg";

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
    <nav className="fixed bottom-4 left-4 right-4 md:left-1/2 md:right-auto md:-translate-x-1/2 bg-[var(--card-bg)]/90 backdrop-blur-xl border border-[var(--primary-color)]/10 px-6 py-3 rounded-full shadow-2xl z-50 flex items-center justify-around md:justify-center md:gap-8 transition-colors">
      {navItems.map((item) => {
        const isActive = location.pathname === item.path;
        return (
          <Link
            key={item.path}
            to={item.path}
            className={cn(
              "flex flex-col items-center gap-1 transition-all duration-300 min-w-[60px]",
              isActive ? "text-[var(--primary-color)] scale-110" : "text-[var(--primary-color)]/40 hover:text-[var(--primary-color)]/70"
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

function Header({ theme, toggleTheme }: { theme: string, toggleTheme: () => void }) {
  const location = useLocation();
  if (location.pathname === "/reader") return null;

  return (
    <header className="py-4 md:py-6 px-4 md:px-8 flex items-center justify-between">
      <Link to="/" className="flex items-center gap-2 group">
        <div className="w-8 h-8 md:w-10 md:h-10 flex items-center justify-center group-hover:rotate-6 transition-transform">
          <img src={logo} alt="BookHub Logo" className="w-full h-full" />
        </div>
        <span className="text-lg md:text-xl font-serif font-bold tracking-tight text-[var(--text-color)] transition-colors">BookHub</span>
      </Link>

      <div className="flex items-center gap-4">
        <button
          onClick={toggleTheme}
          className="p-2 bg-[var(--accent-bg)] border border-[var(--primary-color)]/10 rounded-full text-[var(--primary-color)]/60 hover:text-[var(--primary-color)] transition-all"
        >
          {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
        </button>
        <a
          href="https://github.com/shalom-lab/bookhub"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 px-3 py-1.5 md:px-4 md:py-2 bg-[var(--accent-bg)] border border-[var(--primary-color)]/10 rounded-full text-[var(--primary-color)]/60 hover:text-[var(--primary-color)] hover:bg-[var(--card-bg)] hover:shadow-sm transition-all duration-300 group"
        >
          <Github className="w-3.5 h-3.5 md:w-4 md:h-4 group-hover:rotate-12 transition-transform" />
          <span className="hidden md:inline text-[10px] md:text-xs font-serif tracking-wider font-medium">GitHub</span>
        </a>
      </div>
    </header>
  );
}

export default function App() {
  const [theme, setTheme] = useState(() => localStorage.getItem("app_theme") || "light");

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("app_theme", theme);
  }, [theme]);

  const toggleTheme = () => setTheme(prev => prev === "light" ? "dark" : "light");

  return (
    <Router basename={import.meta.env.BASE_URL}>
      <Toast />
      <div className="min-h-screen flex flex-col transition-colors duration-300">
        <Header theme={theme} toggleTheme={toggleTheme} />
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
