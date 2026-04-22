import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchBooks, BookFile, getGitHubConfig, deleteBook, getDeleteMode, uploadBook } from "../lib/github";
import { getCachedBooksList } from "../lib/offline";
import { Book, Folder, Search, Loader2, Trash2, X, AlertTriangle, WifiOff, Edit, CheckSquare, Square, Check } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export default function BookShelf() {
  const [books, setBooks] = useState<BookFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<BookFile | null>(null);
  const [deleteMode, setDeleteMode] = useState(false);
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
    setDeleteMode(getDeleteMode());
    getCachedBooksList().then(setCachedUrls);
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

  const handleBatchDelete = async () => {
    if (!config || selectedBooks.length === 0) return;

    setIsBatchDeleting(true);
    try {
      for (const path of selectedBooks) {
        const book = books.find(b => b.path === path);
        if (book) {
          await deleteBook(config, book.path, book.sha);
        }
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
      // Renaming in GitHub: Get file content, create new file, delete old file
      const response = await fetch(editingBook.download_url);
      const blob = await response.blob();
      const file = new File([blob], editingBook.path.split('/').pop()!);

      // Upload with new metadata
      await uploadBook(config, file, editForm.title, editForm.category);
      // Delete old one
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
        <Link
          to="/settings"
          className="px-6 py-2 bg-[var(--primary-color)] text-white rounded-full hover:opacity-90 transition-colors"
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
        <h1 className="text-3xl md:text-4xl font-serif text-[var(--text-color)] tracking-tight">
          我的书架
          <span className="block text-sm font-sans text-[var(--primary-color)] mt-2 opacity-70">
            共 {books.length} 本藏书
          </span>
        </h1>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <button
            onClick={() => {
              setIsSelectMode(!isSelectMode);
              setSelectedBooks([]);
            }}
            className={`p-2 rounded-full transition-colors ${isSelectMode ? 'bg-[var(--primary-color)] text-white' : 'bg-[var(--accent-bg)] text-[var(--primary-color)] border border-[var(--primary-color)]/20'}`}
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
        <div className="flex items-center justify-center min-h-[40vh]">
          <Loader2 className="w-8 h-8 animate-spin text-[var(--primary-color)]" />
        </div>
      ) : Object.keys(groupedBooks).length === 0 ? (
        <div className="text-center py-20 opacity-50 text-[var(--text-color)]">
          <p className="text-lg">暂无书籍，快去上传吧</p>
        </div>
      ) : (
        <>
          {(Object.entries(groupedBooks) as [string, BookFile[]][]).map(([category, categoryBooks]) => (
            <div key={category} className="mb-12">
              <div className="flex items-center gap-2 mb-6 border-b border-[var(--primary-color)]/10 pb-2">
                <Folder className="w-5 h-5 text-[var(--primary-color)]" />
                <h2 className="text-xl font-serif text-[var(--text-color)]">{category}</h2>
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
                        {isSelectMode ? (
                          <button
                            onClick={() => toggleSelect(book.path)}
                            className="block w-full text-left"
                          >
                            <div className={`aspect-[3/4] ${bgColor} book-card flex flex-col items-center justify-between p-6 text-center relative overflow-hidden dark:bg-opacity-20 ${selectedBooks.includes(book.path) ? 'ring-4 ring-[var(--primary-color)] scale-95' : ''}`}>
                              <div className="absolute top-2 right-2 z-40 bg-white rounded-full p-1 shadow-md">
                                {selectedBooks.includes(book.path) ? <CheckSquare className="w-4 h-4 text-[var(--primary-color)]" /> : <Square className="w-4 h-4 text-gray-300" />}
                              </div>
                              <div className="book-spine" />
                              <div className="book-texture" />
                              <div className="flex-1 flex flex-col items-center justify-center py-4 z-10">
                                <h3 className="text-sm font-serif font-bold text-[var(--text-color)] leading-relaxed line-clamp-4 px-2 tracking-tight">
                                  {book.title}
                                </h3>
                              </div>
                            </div>
                          </button>
                        ) : (
                          <Link
                            to={`/reader?url=${encodeURIComponent(book.download_url)}&title=${encodeURIComponent(book.title)}`}
                            className="block"
                          >
                            <div className={`aspect-[3/4] ${bgColor} book-card flex flex-col items-center justify-between p-6 text-center relative overflow-hidden dark:bg-opacity-20`}>
                              <div className="book-spine" />
                              <div className="book-texture" />

                              <div className="w-full h-px bg-black/5 mt-4 z-10" />
                              <div className="flex-1 flex flex-col items-center justify-center py-4 z-10">
                                <h3 className="text-sm font-serif font-bold text-[var(--text-color)] leading-relaxed line-clamp-4 px-2 tracking-tight">
                                  {book.title}
                                </h3>
                              </div>
                              <div className="w-full flex flex-col items-center gap-2 mb-4 z-10">
                                <div className="w-8 h-px bg-black/20" />
                                <span className="text-[10px] uppercase tracking-widest text-[var(--primary-color)] font-medium">
                                  {book.category}
                                </span>
                              </div>

                              {cachedUrls.includes(book.download_url) && (
                                <div className="absolute top-3 left-3 z-30 bg-black/30 backdrop-blur-md rounded-full p-1 border border-white/20" title="已离线缓存">
                                  <WifiOff className="w-3 h-3 text-white" />
                                </div>
                              )}

                              <div className="absolute bottom-4 right-4 md:opacity-0 md:group-hover:opacity-100 opacity-100 transition-all duration-500 md:translate-y-2 md:group-hover:translate-y-0 z-20">
                                <span className="text-[10px] tracking-[0.2em] font-serif bg-[var(--card-bg)]/90 backdrop-blur-md text-[var(--text-color)] px-4 py-1.5 rounded-full shadow-sm border border-black/5 font-bold">
                                  开始阅读
                                </span>
                              </div>
                            </div>
                          </Link>
                        )}

                        {!isSelectMode && (
                          <div className="absolute top-3 right-3 flex flex-col gap-2 md:opacity-0 md:group-hover:opacity-100 opacity-100 transition-all duration-300 z-20">
                            <button
                              onClick={() => {
                                setEditingBook(book);
                                setEditForm({ title: book.title, category: book.category });
                              }}
                              className="w-8 h-8 flex items-center justify-center bg-white/80 backdrop-blur-md text-[var(--primary-color)] rounded-full border border-[var(--primary-color)]/10 hover:bg-white transition-all shadow-sm"
                              title="编辑信息"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                            {deleteMode && (
                              <button
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setConfirmDelete(book);
                                }}
                                className="w-8 h-8 flex items-center justify-center bg-red-50/80 backdrop-blur-md text-red-500 rounded-full border border-red-100 hover:bg-red-50 transition-all shadow-sm"
                                title="删除书籍"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
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
              <motion.div
                initial={{ y: 100 }}
                animate={{ y: 0 }}
                exit={{ y: 100 }}
                className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-[var(--card-bg)] border border-[var(--primary-color)]/20 px-6 py-4 rounded-2xl shadow-2xl z-40 flex items-center gap-8 backdrop-blur-xl"
              >
                <div className="flex flex-col">
                  <span className="text-xs text-[var(--primary-color)] font-medium">已选择 {selectedBooks.length} 本书籍</span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setSelectedBooks([])}
                    className="px-4 py-2 text-xs font-medium text-[var(--primary-color)] hover:bg-[var(--accent-bg)] rounded-lg transition-colors"
                  >
                    取消选择
                  </button>
                  <button
                    onClick={handleBatchDelete}
                    disabled={isBatchDeleting}
                    className="px-4 py-2 text-xs font-medium bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors flex items-center gap-2"
                  >
                    {isBatchDeleting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                    批量删除
                  </button>
                </div>
              </motion.div>
            )}

            {editingBook && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setEditingBook(null)}
                  className="absolute inset-0 bg-black/20 backdrop-blur-sm"
                />
                <motion.div
                  initial={{ opacity: 0, scale: 0.9, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: 20 }}
                  className="relative bg-[var(--card-bg)] rounded-2xl p-8 max-w-sm w-full shadow-2xl border border-[var(--primary-color)]/10"
                >
                  <h3 className="text-xl font-serif text-[var(--text-color)] mb-6">编辑书籍信息</h3>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-[var(--primary-color)]">书名</label>
                      <input
                        type="text"
                        value={editForm.title}
                        onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                        className="w-full px-4 py-2 bg-[var(--accent-bg)] border border-[var(--primary-color)]/20 rounded-lg text-sm text-[var(--text-color)]"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-[var(--primary-color)]">分类</label>
                      <input
                        type="text"
                        value={editForm.category}
                        onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                        className="w-full px-4 py-2 bg-[var(--accent-bg)] border border-[var(--primary-color)]/20 rounded-lg text-sm text-[var(--text-color)]"
                      />
                    </div>
                    <div className="flex gap-3 pt-4">
                      <button
                        onClick={() => setEditingBook(null)}
                        className="flex-1 py-2 bg-[var(--accent-bg)] text-[var(--primary-color)] rounded-lg text-sm font-medium"
                      >
                        取消
                      </button>
                      <button
                        onClick={handleEditSave}
                        className="flex-1 py-2 bg-[var(--primary-color)] text-white rounded-lg text-sm font-medium shadow-lg shadow-[var(--primary-color)]/20"
                      >
                        保存
                      </button>
                    </div>
                  </div>
                </motion.div>
              </div>
            )}

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
                  className="relative bg-[var(--card-bg)] rounded-2xl p-8 max-w-sm w-full shadow-2xl border border-[var(--primary-color)]/10"
                >
                  <div className="flex flex-col items-center text-center">
                    <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mb-4">
                      <AlertTriangle className="w-8 h-8 text-red-500" />
                    </div>
                    <h3 className="text-xl font-serif text-[var(--text-color)] mb-2">确认删除书籍？</h3>
                    <p className="text-sm text-[var(--primary-color)] mb-6">
                      您正在尝试删除 <span className="font-bold">《{confirmDelete.title}》</span>。此操作不可撤销。
                    </p>
                    <div className="flex gap-3 w-full">
                      <button
                        onClick={() => setConfirmDelete(null)}
                        className="flex-1 py-3 bg-[var(--accent-bg)] text-[var(--primary-color)] rounded-xl hover:bg-[var(--primary-color)]/10 transition-colors text-sm font-medium"
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
