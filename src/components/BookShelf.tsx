import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchBooks, BookFile, getGitHubConfig, deleteBook, uploadBook } from "../lib/github";
import { getCachedBooksList, isUrlCached } from "../lib/offline";
import { Book, Folder, Search, Loader2, Trash2, X, AlertTriangle, WifiOff, Edit, CheckSquare, Square } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

// 定义素雅的分类配色方案
const CATEGORY_STYLES: Record<string, { bg: string, pattern: string, fg: string }> = {
  "math": { bg: "#e2e8f0", fg: "#475569", pattern: "repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255,255,255,0.4) 10px, rgba(255,255,255,0.4) 20px)" },
  "数学": { bg: "#e2e8f0", fg: "#475569", pattern: "repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255,255,255,0.4) 10px, rgba(255,255,255,0.4) 20px)" },
  "文学": { bg: "#fce7f3", fg: "#9d174d", pattern: "radial-gradient(circle, rgba(255,255,255,0.5) 1px, transparent 1px)" },
  "literature": { bg: "#fce7f3", fg: "#9d174d", pattern: "radial-gradient(circle, rgba(255,255,255,0.5) 1px, transparent 1px)" },
  "诗词": { bg: "#fef3c7", fg: "#92400e", pattern: "repeating-linear-gradient(0deg, transparent, transparent 5px, rgba(255,255,255,0.3) 5px, rgba(255,255,255,0.3) 10px)" },
  "poetry": { bg: "#fef3c7", fg: "#92400e", pattern: "repeating-linear-gradient(0deg, transparent, transparent 5px, rgba(255,255,255,0.3) 5px, rgba(255,255,255,0.3) 10px)" },
  "计算机": { bg: "#dcfce7", fg: "#166534", pattern: "linear-gradient(90deg, rgba(255,255,255,0.3) 1px, transparent 1px)" },
  "cs": { bg: "#dcfce7", fg: "#166534", pattern: "linear-gradient(90deg, rgba(255,255,255,0.3) 1px, transparent 1px)" },
  "default": { bg: "#f3f4f6", fg: "#374151", pattern: "none" }
};

// 自动生成素雅背景色的函数 (用于保底)
const getFallbackStyle = (str: string) => {
  const hash = str.split("").reduce((acc, char) => char.charCodeAt(0) + acc, 0);
  const colors = [
    { bg: "#f1f5f9", fg: "#64748b" }, // Slate
    { bg: "#ecfdf5", fg: "#059669" }, // Emerald
    { bg: "#eff6ff", fg: "#2563eb" }, // Blue
    { bg: "#faf5ff", fg: "#7c3aed" }, // Purple
    { bg: "#fff7ed", fg: "#ea580c" }, // Orange
  ];
  return { ...colors[hash % colors.length], pattern: "none" };
};

export default function BookShelf() {
  const [books, setBooks] = useState<BookFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [cachedUrls, setCachedUrls] = useState<string[]>([]);
  const [selectedBooks, setSelectedBooks] = useState<string[]>([]);
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [editingBook, setEditingBook] = useState<BookFile | null>(null);
  const [editForm, setEditForm] = useState({ title: "", category: "" });
  const [isBatchDeleting, setIsBatchDeleting] = useState(false);
  const config = getGitHubConfig();

  const loadBooks = () => {
    if (config) {
      setLoading(true);
      fetchBooks(config).then((data) => {
        setBooks(data);
        setLoading(false);
      });
    } else {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBooks();
    getCachedBooksList().then(setCachedUrls);
  }, []);

  const handleBatchDelete = async () => {
    if (!config || selectedBooks.length === 0) return;
    setIsBatchDeleting(true);
    try {
      for (const path of selectedBooks) {
        const book = books.find(b => b.path === path);
        if (book) await deleteBook(config, book.path, book.sha);
      }
      setBooks(books.filter(b => !selectedBooks.includes(b.path)));
      setSelectedBooks([]);
      setIsSelectMode(false);
    } catch (error) {
      console.error("Batch delete failed:", error);
    } finally {
      setIsBatchDeleting(false);
    }
  };

  const handleEditSave = async () => {
    if (!editingBook || !config) return;
    try {
      setLoading(true);
      const response = await fetch(editingBook.download_url);
      const blob = await response.blob();
      const file = new File([blob], editingBook.path.split('/').pop()!);
      await uploadBook(config, file, editForm.title, editForm.category);
      await deleteBook(config, editingBook.path, editingBook.sha);
      loadBooks();
      setEditingBook(null);
    } catch (error) {
      console.error("Edit failed:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleSelect = (path: string) => {
    if (selectedBooks.includes(path)) {
      setSelectedBooks(selectedBooks.filter(p => p !== path));
    } else {
      setSelectedBooks([...selectedBooks, path]);
    }
  };

  const filteredBooks = books.filter(
    (book) =>
      book.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      book.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const groupedBooks = filteredBooks.reduce((acc, book) => {
    if (!acc[book.category]) acc[book.category] = [];
    acc[book.category].push(book);
    return acc;
  }, {} as Record<string, BookFile[]>);

  if (!config) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8">
        <Book className="w-16 h-16 text-[var(--primary-color)] mb-4 opacity-50" />
        <h2 className="text-2xl font-serif mb-2 text-[var(--text-color)]">欢迎来到墨香书阁</h2>
        <p className="text-[var(--primary-color)] mb-6">请先在设置中配置您的 GitHub 仓库信息</p>
        <Link to="/settings" className="px-6 py-2 bg-[var(--primary-color)] text-white rounded-full hover:opacity-90 transition-colors">前往设置</Link>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 relative">
      <div className="book-texture opacity-[0.02] fixed inset-0 pointer-events-none" />
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 md:mb-12 gap-6 relative z-10">
        <h1 className="text-3xl md:text-4xl font-serif text-[var(--text-color)] tracking-tight">
          我的书架
          <span className="block text-sm font-sans text-[var(--primary-color)] mt-2 opacity-70">共 {books.length} 本藏书</span>
        </h1>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <button
            onClick={() => { setIsSelectMode(!isSelectMode); setSelectedBooks([]); }}
            className={`p-2 rounded-full transition-colors ${isSelectMode ? 'bg-[var(--primary-color)] text-white shadow-lg' : 'bg-[var(--accent-bg)] text-[var(--primary-color)] border border-[var(--primary-color)]/20'}`}
            title="批量管理"
          >
            <CheckSquare className="w-4 h-4" />
          </button>
          <div className="relative flex-1 md:flex-none">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--primary-color)]" />
            <input
              type="text"
              placeholder="搜索书名或分类..."
              className="pl-11 pr-4 py-3 md:py-2 bg-[var(--card-bg)]/50 border border-[var(--primary-color)]/20 rounded-full focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)]/30 w-full md:w-64 text-sm text-[var(--text-color)]"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center min-h-[40vh]"><Loader2 className="w-8 h-8 animate-spin text-[var(--primary-color)]" /></div>
      ) : Object.keys(groupedBooks).length === 0 ? (
        <div className="text-center py-20 opacity-50 text-[var(--text-color)]"><p className="text-lg">暂无书籍，快去上传吧</p></div>
      ) : (
        <>
          {(Object.entries(groupedBooks) as [string, BookFile[]][]).map(([category, categoryBooks]) => (
            <div key={category} className="mb-12">
              <div className="flex items-center gap-2 mb-6 border-b border-[var(--primary-color)]/10 pb-2">
                <Folder className="w-5 h-5 text-[var(--primary-color)]" />
                <h2 className="text-xl font-serif text-[var(--text-color)]">{category}</h2>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6 sm:gap-8 md:gap-10">
                {categoryBooks.map((book, index) => {
                  // 大小写不敏感匹配
                  const catKey = book.category.toLowerCase();
                  const style = CATEGORY_STYLES[catKey] || getFallbackStyle(book.category);
                  
                  return (
                    <motion.div key={book.path} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }}>
                      <div className="group relative">
                        {isSelectMode ? (
                          <button onClick={() => toggleSelect(book.path)} className="block w-full text-left">
                            <div 
                              className={`aspect-[3/4] book-card flex flex-col items-center justify-between p-6 text-center relative overflow-hidden transition-all duration-500 ${selectedBooks.includes(book.path) ? 'ring-4 ring-[var(--primary-color)] scale-95 shadow-xl' : 'hover:scale-105'}`}
                              style={{ backgroundColor: style.bg }}
                            >
                              <div className="absolute inset-0 opacity-20" style={{ backgroundImage: style.pattern, backgroundSize: '20px 20px' }} />
                              <div className="absolute top-2 right-2 z-40 bg-white rounded-full p-1 shadow-md">
                                {selectedBooks.includes(book.path) ? <CheckSquare className="w-4 h-4 text-[var(--primary-color)]" /> : <Square className="w-4 h-4 text-gray-300" />}
                              </div>
                              <div className="flex-1 flex flex-col items-center justify-center py-4 z-10">
                                <h3 className="text-sm font-serif font-bold leading-relaxed line-clamp-4 px-2 tracking-tight shadow-sm" style={{ color: style.fg }}>{book.title}</h3>
                              </div>
                            </div>
                          </button>
                        ) : (
                          <Link to={`/reader?url=${encodeURIComponent(book.download_url)}&title=${encodeURIComponent(book.title)}`} className="block">
                            <div 
                              className="aspect-[3/4] book-card flex flex-col items-center justify-between p-6 text-center relative overflow-hidden transition-all duration-500 hover:scale-105 hover:shadow-2xl group border border-black/5"
                              style={{ backgroundColor: style.bg }}
                            >
                              {/* 纹理层 */}
                              <div className="absolute inset-0 opacity-[0.2] mix-blend-multiply" style={{ backgroundImage: style.pattern, backgroundSize: '30px 30px' }} />
                              
                              {/* 模拟书脊 */}
                              <div className="absolute left-0 top-0 bottom-0 w-3.5 bg-black/5 border-r border-black/5 z-20 shadow-inner" />
                              <div className="absolute left-3.5 top-0 bottom-0 w-px bg-white/20 z-20" />

                              <div className="flex-1 flex flex-col items-center justify-center py-4 z-10">
                                <h3 className="text-sm font-serif font-bold leading-relaxed line-clamp-4 px-4 tracking-tight drop-shadow-sm" style={{ color: style.fg }}>
                                  {book.title}
                                </h3>
                              </div>
                              
                              <div className="w-full flex flex-col items-center gap-2 mb-4 z-10">
                                <div className="w-8 h-px bg-black/10" />
                                <span className="text-[9px] uppercase tracking-[0.2em] font-extrabold opacity-50" style={{ color: style.fg }}>
                                  {book.category}
                                </span>
                              </div>

                              {isUrlCached(book.download_url, cachedUrls) && (
                                <div className="absolute top-3 left-6 z-30 bg-black/10 backdrop-blur-sm rounded-full p-1 border border-white/20">
                                  <WifiOff className="w-2.5 h-2.5 text-white" />
                                </div>
                              )}

                              <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-all duration-500 translate-y-2 group-hover:translate-y-0 z-20">
                                <span className="text-[9px] tracking-[0.2em] font-serif bg-white/95 backdrop-blur-md px-4 py-2 rounded-full shadow-lg border border-black/5 font-extrabold text-gray-800">
                                  OPEN BOOK
                                </span>
                              </div>
                            </div>
                          </Link>
                        )}
                        {!isSelectMode && (
                          <div className="absolute top-3 right-3 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300 z-30">
                            <button onClick={() => { setEditingBook(book); setEditForm({ title: book.title, category: book.category }); }} className="w-8 h-8 flex items-center justify-center bg-white/95 backdrop-blur-md text-gray-600 rounded-full border border-black/5 hover:bg-white transition-all shadow-xl"><Edit className="w-3.5 h-3.5" /></button>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          ))}

          <AnimatePresence>
            {isSelectMode && selectedBooks.length > 0 && (
              <motion.div initial={{ y: 100 }} animate={{ y: 0 }} exit={{ y: 100 }} className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-white/95 border border-black/10 px-8 py-4 rounded-3xl shadow-2xl z-50 flex items-center gap-8 backdrop-blur-xl">
                <div className="flex flex-col"><span className="text-xs text-gray-500 font-medium">已选择 {selectedBooks.length} 本书籍</span></div>
                <div className="flex gap-3">
                  <button onClick={() => setSelectedBooks([])} className="px-5 py-2 text-xs font-bold text-gray-400 hover:text-gray-600 transition-colors">取消</button>
                  <button onClick={handleBatchDelete} disabled={isBatchDeleting} className="px-6 py-2 text-xs font-bold bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors flex items-center gap-2 shadow-lg shadow-red-200">
                    {isBatchDeleting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}确认删除
                  </button>
                </div>
              </motion.div>
            )}
            {editingBook && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setEditingBook(null)} className="absolute inset-0 bg-black/20 backdrop-blur-sm" />
                <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }} className="relative bg-white/95 backdrop-blur-xl rounded-3xl p-8 max-w-sm w-full shadow-2xl border border-black/5">
                  <h3 className="text-xl font-serif mb-6 font-extrabold">编辑书籍</h3>
                  <div className="space-y-5">
                    <div className="space-y-2"><label className="text-[10px] uppercase tracking-widest font-extrabold opacity-30">书名</label><input type="text" value={editForm.title} onChange={(e) => setEditForm({ ...editForm, title: e.target.value })} className="w-full px-4 py-3 bg-gray-50/50 border border-black/5 rounded-xl text-sm" /></div>
                    <div className="space-y-2"><label className="text-[10px] uppercase tracking-widest font-extrabold opacity-30">分类</label><input type="text" value={editForm.category} onChange={(e) => setEditForm({ ...editForm, category: e.target.value })} className="w-full px-4 py-3 bg-gray-50/50 border border-black/5 rounded-xl text-sm" /></div>
                    <div className="flex gap-3 pt-4"><button onClick={() => setEditingBook(null)} className="flex-1 py-3 bg-gray-100 text-gray-500 rounded-xl text-sm font-bold">取消</button><button onClick={handleEditSave} className="flex-1 py-3 bg-black text-white rounded-xl text-sm font-bold shadow-lg shadow-black/20">保存修改</button></div>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>
        </>
      )}
    </div>
  );
}
