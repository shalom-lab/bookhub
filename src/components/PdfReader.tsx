import React from "react";
import { PDFViewer } from '@embedpdf/react-pdf-viewer';

interface PdfReaderProps {
  bookUrl: string;
}

export default function PdfReader({ bookUrl }: PdfReaderProps) {
  return (
    <div style={{ width: '100vw', height: '100vh', background: '#fff', overflow: 'hidden' }}>
      <PDFViewer
        config={{
          src: bookUrl,
          theme: { preference: 'light' }
        }}
        style={{ height: '100%', width: '100%' }}
      />
    </div>
  );
}
