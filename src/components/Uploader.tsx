import React, { useState } from "react";
import { uploadBook, getGitHubConfig } from "../lib/github";
import { Upload, FileText, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { motion } from "motion/react";

export default function Uploader() {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [error, setError] = useState("");
  const [uploadedFileName, setUploadedFileName] = useState("");

  const config = getGitHubConfig();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      // Auto-fill title from filename if empty
      if (!title) {
        setTitle(selectedFile.name.replace(".epub", ""));
      }
      // Auto-fill category if empty (e.g., from filename prefix if exists)
      if (!category && selectedFile.name.includes("_")) {
        setCategory(selectedFile.name.split("_")[0]);
      }
      setStatus("idle");
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !title || !category || !config) return;

    setUploading(true);
    setStatus("idle");
    setError("");

    try {
      const fileName = await uploadBook(config, file, title, category);
      setUploadedFileName(fileName);
      setStatus("success");
      setFile(null);
      setTitle("");
      setCategory("");
    } catch (err: any) {
      setStatus("error");
      setError(err.message || "上传失败，请检查配置和网络");
    } finally {
      setUploading(false);
    }
  };

  if (!config) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8">
        <AlertCircle className="w-16 h-16 text-[#8b7e66] mb-4 opacity-50" />
        <h2 className="text-2xl font-serif mb-2">配置缺失</h2>
        <p className="text-[#8b7e66] mb-6">请先在设置中配置您的 GitHub 仓库信息</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 md:py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-[#8b7e66]/10"
      >
        <div className="flex items-center gap-3 mb-8">
          <Upload className="w-6 h-6 text-[#8b7e66]" />
          <h1 className="text-2xl font-serif text-[#4a4a4a]">上传新书</h1>
        </div>

        <form onSubmit={handleUpload} className="space-y-6">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-[#8b7e66]">选择 EPUB 文件</label>
            <div className="relative">
              <input
                type="file"
                accept=".epub"
                onChange={handleFileChange}
                className="hidden"
                id="epub-upload"
              />
              <label
                htmlFor="epub-upload"
                className="flex flex-col items-center justify-center w-full h-40 md:h-32 border-2 border-dashed border-[#8b7e66]/20 rounded-xl cursor-pointer hover:bg-[#fdfaf6] transition-colors"
              >
                {file ? (
                  <div className="flex items-center gap-2 text-[#4a4a4a]">
                    <FileText className="w-5 h-5" />
                    <span className="text-sm truncate max-w-[200px]">{file.name}</span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2 text-[#8b7e66]/60">
                    <Upload className="w-8 h-8" />
                    <span className="text-sm">点击或拖拽文件到这里</span>
                  </div>
                )}
              </label>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-[#8b7e66]">书名</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="例如：牛津通识读本"
                className="w-full px-4 py-2 bg-[#fdfaf6] border border-[#8b7e66]/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#8b7e66]/30"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-[#8b7e66]">分类</label>
              <input
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="例如：Math"
                className="w-full px-4 py-2 bg-[#fdfaf6] border border-[#8b7e66]/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#8b7e66]/30"
                required
              />
            </div>
          </div>

          <div className="pt-4">
            <button
              type="submit"
              disabled={uploading || !file || !title || !category}
              className="w-full py-3 bg-[#8b7e66] text-white rounded-xl hover:bg-[#7a6d55] disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 shadow-lg shadow-[#8b7e66]/20"
            >
              {uploading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  正在上传...
                </>
              ) : (
                <>
                  <Upload className="w-5 h-5" />
                  开始上传
                </>
              )}
            </button>
          </div>

          {status === "success" && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center gap-2 p-4 bg-green-50 text-green-700 rounded-lg border border-green-100"
            >
              <CheckCircle className="w-5 h-5" />
              <div className="flex flex-col">
                <span className="font-medium">书籍上传成功！</span>
                <span className="text-xs opacity-80">文件名：{uploadedFileName}</span>
              </div>
            </motion.div>
          )}

          {status === "error" && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center gap-2 p-4 bg-red-50 text-red-700 rounded-lg border border-red-100"
            >
              <AlertCircle className="w-5 h-5" />
              <span>{error}</span>
            </motion.div>
          )}
        </form>

        <div className="mt-8 p-4 bg-[#fdfaf6] rounded-xl border border-[#8b7e66]/10">
          <h3 className="text-sm font-serif text-[#8b7e66] mb-2 flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            上传说明
          </h3>
          <ul className="text-xs text-[#8b7e66]/70 space-y-1 list-disc pl-4">
            <li>文件将自动重命名为 <code>分类_书名.epub</code> 格式。</li>
            <li>GitHub API 限制文件大小约为 25MB。</li>
            <li>上传后可能需要几秒钟时间才能在书架中显示。</li>
          </ul>
        </div>
      </motion.div>
    </div>
  );
}
