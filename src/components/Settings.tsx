import React, { useState, useEffect } from "react";
import { GitHubConfig, saveGitHubConfig, verifyGitHubConfig } from "../lib/github";
import { toast } from "../lib/toast";
import { Settings as SettingsIcon, Key, User, Github, Save, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { motion } from "motion/react";

export default function Settings() {
  const [config, setConfig] = useState<GitHubConfig>({
    token: "",
    owner: "",
    repo: "",
  });
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    setConfig({
      token: localStorage.getItem("gh-bookhub-token") || "",
      owner: localStorage.getItem("gh-bookhub-owner") || "",
      repo: localStorage.getItem("gh-bookhub-repo") || "",
    });
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setVerifying(true);
    try {
      await verifyGitHubConfig(config);
      saveGitHubConfig(config);
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
        className="bg-[var(--card-bg)] rounded-2xl p-6 md:p-8 shadow-sm border border-[var(--primary-color)]/10"
      >
        <div className="flex items-center gap-3 mb-8">
          <SettingsIcon className="w-6 h-6 text-[var(--primary-color)]" />
          <h1 className="text-2xl font-serif text-[var(--text-color)]">系统设置</h1>
        </div>

        <form onSubmit={handleSave} className="space-y-8">
          <div className="space-y-6">
            <h2 className="text-sm font-serif text-[var(--primary-color)] border-b border-[var(--primary-color)]/10 pb-2">仓库配置</h2>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-[var(--primary-color)] flex items-center gap-2">
                  <Key className="w-4 h-4" />
                  GitHub Fine-grained PAT
                </label>
                <input
                  type="password"
                  value={config.token}
                  onChange={(e) => setConfig({ ...config, token: e.target.value })}
                  placeholder="github_pat_..."
                  className="w-full px-4 py-2 bg-[var(--accent-bg)] border border-[var(--primary-color)]/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)]/30 text-[var(--text-color)]"
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-[var(--primary-color)] flex items-center gap-2">
                    <User className="w-4 h-4" />
                    GitHub 用户名
                  </label>
                  <input
                    type="text"
                    value={config.owner}
                    onChange={(e) => setConfig({ ...config, owner: e.target.value })}
                    placeholder="例如：octocat"
                    className="w-full px-4 py-2 bg-[var(--accent-bg)] border border-[var(--primary-color)]/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)]/30 text-[var(--text-color)]"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-[var(--primary-color)] flex items-center gap-2">
                    <Github className="w-4 h-4" />
                    仓库名称
                  </label>
                  <input
                    type="text"
                    value={config.repo}
                    onChange={(e) => setConfig({ ...config, repo: e.target.value })}
                    placeholder="例如：my-books"
                    className="w-full px-4 py-2 bg-[var(--accent-bg)] border border-[var(--primary-color)]/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)]/30 text-[var(--text-color)]"
                    required
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="pt-4">
            <button
              type="submit"
              disabled={verifying}
              className="w-full py-3 bg-[var(--primary-color)] text-white rounded-xl hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 shadow-lg shadow-[var(--primary-color)]/20"
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

        <div className="mt-12 p-6 bg-[var(--accent-bg)] rounded-2xl border border-[var(--primary-color)]/10">
          <h3 className="text-sm font-serif text-[var(--primary-color)] mb-4 flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            快速开始指南
          </h3>
          <ol className="text-xs text-[var(--primary-color)]/70 space-y-3 list-decimal pl-4">
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
