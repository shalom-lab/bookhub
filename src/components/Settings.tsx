import React, { useState, useEffect } from "react";
import { GitHubConfig, saveGitHubConfig, getDeleteMode, saveDeleteMode, verifyGitHubConfig } from "../lib/github";
import { toast } from "../lib/toast";
import { Settings as SettingsIcon, Key, User, Github, Save, CheckCircle, AlertCircle, Trash2, Loader2 } from "lucide-react";
import { motion } from "motion/react";

export default function Settings() {
  const [config, setConfig] = useState<GitHubConfig>({
    token: "",
    owner: "",
    repo: "",
  });
  const [deleteMode, setDeleteMode] = useState(false);
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    setConfig({
      token: localStorage.getItem("gh-bookhub-token") || "",
      owner: localStorage.getItem("gh-bookhub-owner") || "",
      repo: localStorage.getItem("gh-bookhub-repo") || "",
    });
    setDeleteMode(getDeleteMode());
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setVerifying(true);
    try {
      await verifyGitHubConfig(config);
      saveGitHubConfig(config);
      saveDeleteMode(deleteMode);
      toast.success("配置校验通过并已保存");
    } catch (err: any) {
      toast.error(err.message || "由于未知原因未能通过校验");
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 md:py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-[#8b7e66]/10"
      >
        <div className="flex items-center gap-3 mb-8">
          <SettingsIcon className="w-6 h-6 text-[#8b7e66]" />
          <h1 className="text-2xl font-serif text-[#4a4a4a]">系统设置</h1>
        </div>

        <form onSubmit={handleSave} className="space-y-8">
          <div className="space-y-6">
            <h2 className="text-sm font-serif text-[#8b7e66] border-b border-[#8b7e66]/10 pb-2">仓库配置</h2>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-[#8b7e66] flex items-center gap-2">
                  <Key className="w-4 h-4" />
                  GitHub Fine-grained PAT
                </label>
                <input
                  type="password"
                  value={config.token}
                  onChange={(e) => setConfig({ ...config, token: e.target.value })}
                  placeholder="github_pat_..."
                  className="w-full px-4 py-2 bg-[#fdfaf6] border border-[#8b7e66]/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#8b7e66]/30"
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-[#8b7e66] flex items-center gap-2">
                    <User className="w-4 h-4" />
                    GitHub 用户名
                  </label>
                  <input
                    type="text"
                    value={config.owner}
                    onChange={(e) => setConfig({ ...config, owner: e.target.value })}
                    placeholder="例如：octocat"
                    className="w-full px-4 py-2 bg-[#fdfaf6] border border-[#8b7e66]/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#8b7e66]/30"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-[#8b7e66] flex items-center gap-2">
                    <Github className="w-4 h-4" />
                    仓库名称
                  </label>
                  <input
                    type="text"
                    value={config.repo}
                    onChange={(e) => setConfig({ ...config, repo: e.target.value })}
                    placeholder="例如：my-books"
                    className="w-full px-4 py-2 bg-[#fdfaf6] border border-[#8b7e66]/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#8b7e66]/30"
                    required
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <h2 className="text-sm font-serif text-[#8b7e66] border-b border-[#8b7e66]/10 pb-2">功能设置</h2>
            <div className="flex items-center justify-between p-4 bg-[#fdfaf6] rounded-xl border border-[#8b7e66]/10">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-50 rounded-lg">
                  <Trash2 className="w-5 h-5 text-red-500" />
                </div>
                <div>
                  <h3 className="text-sm font-medium text-[#4a4a4a]">开启删除模式</h3>
                  <p className="text-[10px] text-[#8b7e66]/60">开启后，书架页面将显示删除按钮</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDeleteMode(!deleteMode)}
                className={`w-12 h-6 rounded-full transition-colors relative ${deleteMode ? "bg-[#8b7e66]" : "bg-gray-200"
                  }`}
              >
                <div
                  className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${deleteMode ? "left-7" : "left-1"
                    }`}
                />
              </button>
            </div>
          </div>

          <div className="pt-4">
            <button
              type="submit"
              disabled={verifying}
              className="w-full py-3 bg-[#8b7e66] text-white rounded-xl hover:bg-[#7a6d55] disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 shadow-lg shadow-[#8b7e66]/20"
            >
              {verifying ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  正在校验配置...
                </>
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  保存配置
                </>
              )}
            </button>
          </div>
        </form>

        <div className="mt-12 p-6 bg-[#fdfaf6] rounded-2xl border border-[#8b7e66]/10">
          <h3 className="text-sm font-serif text-[#8b7e66] mb-4 flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            快速开始指南
          </h3>
          <ol className="text-xs text-[#8b7e66]/70 space-y-3 list-decimal pl-4">
            <li>在 GitHub 创建一个新仓库（例如 <code>my-bookshelf</code>）。</li>
            <li>在仓库根目录下创建一个名为 <code>book</code> 的文件夹。</li>
            <li>在 <code>book</code> 文件夹内添加一个 <code>.gitkeep</code> 文件（如果文件夹为空）。</li>
            <li>前往 <a href="https://github.com/settings/tokens?type=beta" target="_blank" className="underline">GitHub Settings</a> 生成一个 Fine-grained PAT。</li>
            <li>将 Token、用户名和仓库名填写在上方并保存。</li>
          </ol>
        </div>
      </motion.div>
    </div>
  );
}
