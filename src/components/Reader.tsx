import React from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { PDFViewer, ScrollStrategy } from '@embedpdf/react-pdf-viewer';
import { ArrowLeft } from "lucide-react";
import { ReactReader } from "react-reader";

// 这是一个极致精简的 Reader，完全复刻 PdfTest 的成功经验
export default function Reader() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const bookUrl = searchParams.get("url");
  const bookTitle = searchParams.get("title") || "阅读器";

  if (!bookUrl) return <div className="h-screen flex items-center justify-center">未找到书籍</div>;

  const isPdf = bookUrl.toLowerCase().split('?')[0].endsWith('.pdf');

  // --- 核心同步：如果是 PDF，直接采用 PdfTest 的“暴力渲染”方案，不走任何额外逻辑 ---
  if (isPdf) {
    return (
      <div style={{ width: '100%', height: '100vh', background: '#fff', overflow: 'hidden' }}>
        <div style={{ height: 'calc(100vh - 40px)', border: '0px solid blue', overflow: 'hidden' }}>
          <PDFViewer
            config={{
              src: bookUrl,
              theme: { preference: 'light' }
            }}
            style={{ height: '100%', width: '100%' }}
            onReady={() => console.log('PDF viewer ready!')}
          />
        </div>
      </div>
    );
  }

  // --- EPUB 模式暂时保留一个最简单的逻辑 ---
  return (
    <div className="h-screen w-full flex flex-col">
      <div className="h-14 flex items-center px-4 border-b">
        <button onClick={() => navigate(-1)}><ArrowLeft className="w-5 h-5" /></button>
        <h1 className="ml-4 font-bold">{bookTitle}</h1>
      </div>
      <div className="flex-1 relative">
        <ReactReader
          url={bookUrl}
          title={bookTitle}
          location={0}
          locationChanged={() => { }}
        />
      </div>
    </div>
  );
}
