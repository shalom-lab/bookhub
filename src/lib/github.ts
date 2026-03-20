import { Octokit } from "octokit";

export interface GitHubConfig {
  token: string;
  owner: string;
  repo: string;
}

export const getGitHubConfig = (): GitHubConfig | null => {
  const token = localStorage.getItem("gh-bookhub-token");
  const owner = localStorage.getItem("gh-bookhub-owner");
  const repo = localStorage.getItem("gh-bookhub-repo");
  
  if (token && owner && repo) {
    return { token, owner, repo };
  }
  return null;
};

export const saveGitHubConfig = (config: GitHubConfig) => {
  localStorage.setItem("gh-bookhub-token", config.token);
  localStorage.setItem("gh-bookhub-owner", config.owner);
  localStorage.setItem("gh-bookhub-repo", config.repo);
};
export const verifyGitHubConfig = async (config: GitHubConfig): Promise<boolean> => {
  // Use a fresh raw Octokit to bypass the global toast hooks during validation
  const octokit = new Octokit({ auth: config.token });
  
  try {
    // 1. Check if repo & book folder are readable
    await octokit.request("GET /repos/{owner}/{repo}/contents/{path}", {
      owner: config.owner,
      repo: config.repo,
      path: "book",
    });

    // 2. Check write permission via a dummy file creation and deletion
    const testPath = `book/.bookhub-test-${Date.now()}`;
    // simple base64 "test"
    const encContent = btoa("test");

    const createRes = await octokit.request("PUT /repos/{owner}/{repo}/contents/{path}", {
      owner: config.owner,
      repo: config.repo,
      path: testPath,
      message: "bookhub permissions test",
      content: encContent,
    });

    await octokit.request("DELETE /repos/{owner}/{repo}/contents/{path}", {
      owner: config.owner,
      repo: config.repo,
      path: testPath,
      message: "clean up test file",
      sha: (createRes.data.content as any).sha,
    });

    return true;
  } catch (error: any) {
    if (error.status === 404) {
      throw new Error("仓库名/用户名有误，或未能在根目录找到 book 文件夹");
    } else if (error.status === 401 || error.status === 403) {
      throw new Error("Token 权限验证失败，确保授予了 Contents 读写权限");
    } else {
      throw new Error(`连接失败: ${error.message}`);
    }
  }
};

export const getDeleteMode = (): boolean => {
  return localStorage.getItem("delete_mode") === "true";
};

export const saveDeleteMode = (enabled: boolean) => {
  localStorage.setItem("delete_mode", enabled ? "true" : "false");
};

import { toast } from "./toast";

export const getOctokit = (token: string) => {
  const octokit = new Octokit({ auth: token });
  
  octokit.hook.error("request", async (error, options) => {
    // We only show toast generically for certain global errors like 401 or 403.
    // We don't want to show generic errors for 404 because sometimes we expect 404s (e.g. checking if a file exists before uploading).
    if (error.status === 401) {
      toast.error("GitHub Token已失效或无权限，请检查设置中的配置");
    } else if (error.status === 403) {
      toast.error("请求过于频繁，触发 GitHub API 速率限制，请稍后再试");
    } else if (error.status !== 404) {
      if (options.method === 'GET' || options.method === 'PUT' || options.method === 'DELETE') {
        const path = (options as any).url || "";
        // Simple heuristic to not spam user errors if we are just fetching the book list
        toast.error(`网络请求失败: ${error.message}`);
      }
    }
    throw error;
  });

  return octokit;
};

export interface BookFile {
  name: string;
  path: string;
  sha: string;
  download_url: string;
  category: string;
  title: string;
}

export const fetchBooks = async (config: GitHubConfig): Promise<BookFile[]> => {
  const octokit = getOctokit(config.token);
  try {
    const { data } = await octokit.request("GET /repos/{owner}/{repo}/contents/{path}", {
      owner: config.owner,
      repo: config.repo,
      path: "book",
    });

    if (!Array.isArray(data)) return [];

    return data
      .filter((file: any) => file.name.endsWith(".epub"))
      .map((file: any) => {
        const [category, ...titleParts] = file.name.replace(".epub", "").split("_");
        const title = titleParts.join("_") || category; // Fallback if no underscore
        return {
          name: file.name,
          path: file.path,
          sha: file.sha,
          download_url: file.download_url,
          category: titleParts.length > 0 ? category : "未分类",
          title: title,
        };
      });
  } catch (error) {
    console.error("Error fetching books:", error);
    return [];
  }
};

export const uploadBook = async (
  config: GitHubConfig,
  file: File,
  title: string,
  category: string
): Promise<string> => {
  const octokit = getOctokit(config.token);
  const reader = new FileReader();

  return new Promise((resolve, reject) => {
    reader.onload = async () => {
      try {
        const content = (reader.result as string).split(",")[1];
        const fileName = `${category}_${title}.epub`;
        const path = `book/${fileName}`;

        // Try to get existing file to get its SHA for replacement
        let sha: string | undefined;
        try {
          const { data } = await octokit.request("GET /repos/{owner}/{repo}/contents/{path}", {
            owner: config.owner,
            repo: config.repo,
            path: path,
          });
          if (!Array.isArray(data)) {
            sha = data.sha;
          }
        } catch (e) {
          // File doesn't exist, which is fine
        }

        await octokit.request("PUT /repos/{owner}/{repo}/contents/{path}", {
          owner: config.owner,
          repo: config.repo,
          path: path,
          message: `${sha ? "Update" : "Upload"} book: ${fileName}`,
          content: content,
          sha: sha,
        });
        resolve(fileName);
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

export const deleteBook = async (
  config: GitHubConfig,
  path: string,
  sha: string
): Promise<void> => {
  const octokit = getOctokit(config.token);
  await octokit.request("DELETE /repos/{owner}/{repo}/contents/{path}", {
    owner: config.owner,
    repo: config.repo,
    path: path,
    message: `Delete book: ${path}`,
    sha: sha,
  });
};
