import React from "react";
import { PDFViewer } from '@embedpdf/react-pdf-viewer';

export default function PdfTest() {
  const testUrl = "https://snippet.embedpdf.com/ebook.pdf";

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#fff', overflow: 'hidden' }}>
      <PDFViewer
        config={{ 
          src: testUrl,
          theme: { preference: 'light' }
        }}
        style={{ height: '100%', width: '100%' }}
        onReady={(registry) => {
          console.log('PDF viewer ready!');
        }}
      />
    </div>
  );
}
