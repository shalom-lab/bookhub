import React from "react";
import { PDFViewer } from '@embedpdf/react-pdf-viewer';

export default function PdfTest() {
  const testUrl = "https://snippet.embedpdf.com/ebook.pdf";

  return (
    // 使用这个结构确保在任何父容器下都能撑开
    <div style={{ width: '100%', height: '100vh', background: '#fff' }}>
      <p style={{ color: 'red', fontWeight: 'bold', padding: '10px', margin: 0 }}>
        [App 模式调试1] - 这里应该没有 Header 和 Navigation 了
      </p>
      <div style={{ height: 'calc(100vh - 40px)', border: '2px solid blue', overflow: 'hidden' }}>
        <PDFViewer
          config={{
            src: testUrl,
            theme: { preference: 'light' }
          }}
          style={{ height: '100%' }}
          onReady={(registry) => {
            console.log('PDF viewer ready!', registry);
          }}
        />
      </div>
    </div>
  );
}
