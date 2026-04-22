import ePub from "epubjs";
import * as pdfjsLib from "pdfjs-dist";

// Set worker source for pdfjs - using unpkg for version 5.x
// @ts-ignore
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@5.6.205/build/pdf.worker.min.mjs`;

export const extractCover = async (file: File): Promise<string | null> => {
  const extension = file.name.toLowerCase().split(".").pop();

  if (extension === "epub") {
    return extractEpubCover(file);
  } else if (extension === "pdf") {
    return extractPdfCover(file);
  }
  return null;
};

const resizeImage = (dataUrl: string, maxWidth = 400): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      const scale = maxWidth / img.width;
      if (scale >= 1) {
        resolve(dataUrl);
        return;
      }
      canvas.width = maxWidth;
      if (!ctx) {
        resolve(dataUrl);
        return;
      }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL("image/jpeg", 0.8));
    };
    img.src = dataUrl;
  });
};

const extractEpubCover = async (file: File): Promise<string | null> => {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const book = ePub(arrayBuffer);
    const coverUrl = await book.coverUrl();
    
    if (!coverUrl) return null;

    // Convert blob URL or path to Base64
    const response = await fetch(coverUrl);
    const blob = await response.blob();
    const base64 = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(blob);
    });

    return await resizeImage(base64);
  } catch (error) {
    console.error("Error extracting EPUB cover:", error);
    return null;
  }
};

const extractPdfCover = async (file: File): Promise<string | null> => {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) });
    const pdf = await loadingTask.promise;
    const page = await pdf.getPage(1);
    
    const viewport = page.getViewport({ scale: 0.5 });
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    
    if (!context) return null;
    
    canvas.height = viewport.height;
    canvas.width = viewport.width;
    
    await (page as any).render({ 
      canvasContext: context, 
      viewport: viewport 
    }).promise;
    
    const dataUrl = canvas.toDataURL("image/jpeg", 0.8);
    
    // Cleanup
    pdf.destroy();
    
    return dataUrl;
  } catch (error) {
    console.error("Error extracting PDF cover:", error);
    return null;
  }
};
