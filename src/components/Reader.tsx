import React from "react";
import { useSearchParams } from "react-router-dom";
import EpubReader from "./EpubReader";
import PdfReader from "./PdfReader";

export default function Reader() {
  const [searchParams] = useSearchParams();
  const bookUrl = searchParams.get("url");
  const bookTitle = searchParams.get("title") || "阅读器";

  if (!bookUrl) {
    return <div className="h-screen flex items-center justify-center">未找到书籍</div>;
  }

  // 纯粹的路由分发逻辑
  const isPdf = bookUrl.toLowerCase().split('?')[0].endsWith('.pdf');

  if (isPdf) {
    // 渲染 PDF 专属组件，不带任何 EPUB 逻辑干扰
    return <PdfReader bookUrl={bookUrl} />;
  }

  // 渲染 EPUB 专属组件，带主题和设置
  return <EpubReader bookUrl={bookUrl} bookTitle={bookTitle} />;
}
