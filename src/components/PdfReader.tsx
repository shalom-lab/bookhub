import React from "react";
import { PDFViewer, ScrollStrategy } from '@embedpdf/react-pdf-viewer';

interface PdfReaderProps {
  bookUrl: string;
}

export default function PdfReader({ bookUrl }: PdfReaderProps) {
  return (
    <div style={{ width: '100vw', height: '100vh', background: '#fff', overflow: 'hidden' }}>
      <PDFViewer
        config={{
          src: bookUrl,
          theme: { preference: 'light' },
          zoom: { defaultZoomLevel: 1.0 },
          scroll: { defaultStrategy: ScrollStrategy.Vertical }
        }}
        style={{ height: '100%', width: '100%' }}
        onReady={() => console.log('Pure PDF Reader Ready')}
      />
    </div>
  );
}
