import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchBooks, BookFile, getGitHubConfig, deleteBook, getDeleteMode } from "../lib/github";
import { Book, Folder, Search, Loader2, Trash2, X, AlertTriangle } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export default function BookShelf() {
  const [books, setBooks] = useState<BookFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<BookFile | null>(null);
  const [deleteMode, setDeleteMode] = useState(false);
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
    setDeleteMode(getDeleteMode());
  }, []);

  const handleDelete = async () => {
    if (!confirmDelete || !config) return;
    
    try {
      setLoading(true);
      await deleteBook(config, confirmDelete.path, confirmDelete.sha);
      setBooks(books.filter((b) => b.path !== confirmDelete.path));
      setConfirmDelete(null);
    } catch (error) {
      console.error("Delete failed:", error);
      alert("删除失败，请稍后重试");
    } finally {
      setLoading(false);
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
        <Book className="w-16 h-16 text-[#8b7e66] mb-4 opacity-50" />
        <h2 className="text-2xl font-serif mb-2">欢迎来到墨香书阁</h2>
        <p className="text-[#8b7e66] mb-6">请先在设置中配置您的 GitHub 仓库信息</p>
        <Link
          to="/settings"
          className="px-6 py-2 bg-[#8b7e66] text-white rounded-full hover:bg-[#7a6d55] transition-colors"
        >
          前往设置
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 relative">
      <div className="book-texture opacity-[0.02] fixed inset-0 pointer-events-none" />
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 md:mb-12 gap-6 relative z-10">
        <h1 className="text-3xl md:text-4xl font-serif text-[#4a4a4a] tracking-tight">
          我的书架
          <span className="block text-sm font-sans text-[#8b7e66] mt-2 opacity-70">
            共 {books.length} 本藏书
          </span>
        </h1>
        <div className="relative w-full md:w-auto">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8b7e66]" />
          <input
            type="text"
            placeholder="搜索书名或分类..."
            className="pl-11 pr-4 py-3 md:py-2 bg-white/50 border border-[#8b7e66]/20 rounded-full focus:outline-none focus:ring-2 focus:ring-[#8b7e66]/30 w-full md:w-64 text-sm"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center min-h-[40vh]">
          <Loader2 className="w-8 h-8 animate-spin text-[#8b7e66]" />
        </div>
      ) : Object.keys(groupedBooks).length === 0 ? (
        <div className="text-center py-20 opacity-50">
          <p className="text-lg">暂无书籍，快去上传吧</p>
        </div>
      ) : (
        <>
          {(Object.entries(groupedBooks) as [string, BookFile[]][]).map(([category, categoryBooks]) => (
            <div key={category} className="mb-12">
              <div className="flex items-center gap-2 mb-6 border-b border-[#8b7e66]/10 pb-2">
                <Folder className="w-5 h-5 text-[#8b7e66]" />
                <h2 className="text-xl font-serif text-[#4a4a4a]">{category}</h2>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-6 md:gap-10">
                {categoryBooks.map((book, index) => {
                  const colors = [
                    "bg-[#e8e4d9]", "bg-[#d9e2e8]", "bg-[#e8d9d9]", 
                    "bg-[#d9e8df]", "bg-[#e2d9e8]", "bg-[#e8e2d9]"
                  ];
                  const colorIndex = book.title.length % colors.length;
                  const bgColor = colors[colorIndex];

                  return (
                    <motion.div
                      key={book.path}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <div className="group relative">
                        <Link
                          to={`/reader?url=${encodeURIComponent(book.download_url)}&title=${encodeURIComponent(book.title)}`}
                          className="block"
                        >
                          <div className={`aspect-[3/4] ${bgColor} book-card flex flex-col items-center justify-between p-6 text-center relative`}>
                            <div className="book-spine" />
                            <div className="book-texture" />
                            
                            <div className="w-full h-px bg-black/5 mt-4" />
                            
                            <div className="flex-1 flex flex-col items-center justify-center py-4">
                              <h3 className="text-sm font-serif font-bold text-[#4a4a4a] leading-relaxed line-clamp-4 px-2 tracking-tight">
                                {book.title}
                              </h3>
                            </div>

                            <div className="w-full flex flex-col items-center gap-2 mb-4">
                              <div className="w-8 h-px bg-black/20" />
                              <span className="text-[10px] uppercase tracking-widest text-[#8b7e66] font-medium">
                                {book.category}
                              </span>
                            </div>
                            
                            <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-all duration-500 translate-y-2 group-hover:translate-y-0">
                              <span className="text-[10px] tracking-[0.2em] font-serif bg-white/90 backdrop-blur-md text-[#4a4a4a] px-4 py-1.5 rounded-full shadow-sm border border-black/5 font-bold">
                                开始阅读
                              </span>
                            </div>
                          </div>
                        </Link>

                        {deleteMode && (
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setConfirmDelete(book);
                            }}
                            className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center bg-[#8b7e66]/5 text-[#8b7e66]/40 rounded-full border border-[#8b7e66]/10 opacity-0 group-hover:opacity-100 transition-all duration-300 hover:text-red-500 hover:bg-red-50 hover:border-red-100 z-20"
                            title="删除书籍"
                          >
                            <Trash2 className="w-3.5 h-3.5 stroke-[1.2]" />
                          </button>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          ))}

          <AnimatePresence>
            {confirmDelete && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setConfirmDelete(null)}
                  className="absolute inset-0 bg-black/20 backdrop-blur-sm"
                />
                <motion.div
                  initial={{ opacity: 0, scale: 0.9, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: 20 }}
                  className="relative bg-white rounded-2xl p-8 max-w-sm w-full shadow-2xl border border-[#8b7e66]/10"
                >
                  <div className="flex flex-col items-center text-center">
                    <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mb-4">
                      <AlertTriangle className="w-8 h-8 text-red-500" />
                    </div>
                    <h3 className="text-xl font-serif text-[#4a4a4a] mb-2">确认删除书籍？</h3>
                    <p className="text-sm text-[#8b7e66] mb-6">
                      您正在尝试删除 <span className="font-bold">《{confirmDelete.title}》</span>。此操作不可撤销。
                    </p>
                    <div className="flex gap-3 w-full">
                      <button
                        onClick={() => setConfirmDelete(null)}
                        className="flex-1 py-3 bg-[#fdfaf6] text-[#8b7e66] rounded-xl hover:bg-[#f5f0e6] transition-colors text-sm font-medium"
                      >
                        取消
                      </button>
                      <button
                        onClick={handleDelete}
                        className="flex-1 py-3 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-colors text-sm font-medium shadow-lg shadow-red-500/20"
                      >
                        确认删除
                      </button>
                    </div>
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
