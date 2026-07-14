declare module 'pdfjs-dist' {
  export interface PDFViewport {
    width: number;
    height: number;
  }

  export interface RenderTask {
    promise: Promise<void>;
    cancel(): void;
  }

  export interface PDFPageProxy {
    getViewport(params: { scale: number }): PDFViewport;
    render(params: { canvasContext: CanvasRenderingContext2D; viewport: PDFViewport }): RenderTask;
  }

  export interface PDFDocumentProxy {
    numPages: number;
    getPage(pageNumber: number): Promise<PDFPageProxy>;
  }

  export interface PDFDocumentLoadingTask {
    promise: Promise<PDFDocumentProxy>;
  }

  export function getDocument(src: { data: Uint8Array }): PDFDocumentLoadingTask;

  export const GlobalWorkerOptions: { workerSrc: string };
  export const version: string;
}
