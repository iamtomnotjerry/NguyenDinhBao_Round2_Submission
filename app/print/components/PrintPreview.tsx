'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import {
  FileText,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Rows3,
} from 'lucide-react';
import type { PDFDocumentProxy, RenderTask } from 'pdfjs-dist';
import { btnInteractive, cn } from '@/lib/utils';
import { useLocale } from '@/lib/i18n/context';
import type { BindingType, ColorMode, PaperSize } from '@/lib/print/types';
import { PAPER_SIZE_LABELS } from '@/lib/print/types';

interface PrintPreviewProps {
  file: File | null;
  fileUrl: string;
  pdfDoc: PDFDocumentProxy | null;
  totalPages: number;
  currentPage: number;
  setCurrentPage: (page: number) => void;
  configColor: ColorMode;
  configBinding: BindingType;
  configPaperSize: PaperSize;
  colorPages?: number[];
}

type FitMode = 'width' | 'page' | 'custom';

export default function PrintPreview({
  file,
  fileUrl,
  pdfDoc,
  totalPages,
  currentPage,
  setCurrentPage,
  configColor,
  configBinding,
  configPaperSize,
  colorPages = [],
}: PrintPreviewProps) {
  const { t } = useLocale();
  const [isRendering, setIsRendering] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [fitMode, setFitMode] = useState<FitMode>('page');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const renderTaskRef = useRef<RenderTask | null>(null);

  const activePage = Math.min(Math.max(1, currentPage), Math.max(1, totalPages));
  const isPdf = !!file && file.type === 'application/pdf';
  const isImage = !!file && file.type.startsWith('image/');
  const pageIsColor =
    configColor === 'color' || (configColor === 'mixed' && colorPages.includes(activePage));

  const computeScale = useCallback(
    async (pageNum: number) => {
      if (!pdfDoc || !stageRef.current) return 1.2;
      const pdfPage = await pdfDoc.getPage(pageNum);
      const base = pdfPage.getViewport({ scale: 1 });
      const pad = 48;
      const availW = Math.max(200, stageRef.current.clientWidth - pad);
      const availH = Math.max(240, stageRef.current.clientHeight - pad);

      if (fitMode === 'width') return availW / base.width;
      if (fitMode === 'page') return Math.min(availW / base.width, availH / base.height);
      return zoom;
    },
    [pdfDoc, fitMode, zoom],
  );

  useEffect(() => {
    if (!file || file.type !== 'application/pdf' || !pdfDoc || !canvasRef.current) return;

    let cancelled = false;

    const renderPage = async () => {
      setIsRendering(true);
      try {
        if (renderTaskRef.current) {
          renderTaskRef.current.cancel();
          renderTaskRef.current = null;
        }

        const pdfPage = await pdfDoc.getPage(activePage);
        if (cancelled) return;

        const scale = await computeScale(activePage);
        const viewport = pdfPage.getViewport({ scale });
        const canvas = canvasRef.current!;
        const context = canvas.getContext('2d')!;
        canvas.width = viewport.width;
        canvas.height = viewport.height;

        context.fillStyle = '#ffffff';
        context.fillRect(0, 0, canvas.width, canvas.height);

        const task = pdfPage.render({ canvasContext: context, viewport });
        renderTaskRef.current = task;
        await task.promise;
      } catch (err) {
        if (err instanceof Error && err.name === 'RenderingCancelledException') return;
        console.error('Error rendering PDF page:', err);
      } finally {
        if (!cancelled) setIsRendering(false);
      }
    };

    renderPage();
    return () => {
      cancelled = true;
      renderTaskRef.current?.cancel();
    };
  }, [file, pdfDoc, activePage, computeScale, configPaperSize]);

  const goPrev = () => setCurrentPage(Math.max(1, activePage - 1));
  const goNext = () => setCurrentPage(Math.min(totalPages, activePage + 1));

  const zoomIn = () => {
    setFitMode('custom');
    setZoom((z) => Math.min(3, Math.round((z + 0.15) * 100) / 100));
  };
  const zoomOut = () => {
    setFitMode('custom');
    setZoom((z) => Math.max(0.4, Math.round((z - 0.15) * 100) / 100));
  };

  return (
    <div className="glass-bezel-outer h-full">
      <div className="glass-bezel-inner p-4 md:p-5 flex flex-col h-full min-h-[560px]">
        <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
          <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-400" /> {t.print.preview}
          </h3>
          {file && (
            <div className="flex items-center gap-1.5 flex-wrap justify-end">
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-400">
                {PAPER_SIZE_LABELS[configPaperSize]}
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-400">
                {pageIsColor ? t.print.labelColor : t.print.labelBw}
              </span>
              {configBinding !== 'none' && (
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                  {configBinding}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Toolbar */}
        {file && isPdf && (
          <div className="flex items-center gap-1 mb-3 flex-wrap">
            <button
              type="button"
              onClick={zoomOut}
              className={cn(
                'p-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white',
                btnInteractive,
              )}
              aria-label="Zoom out"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={zoomIn}
              className={cn(
                'p-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white',
                btnInteractive,
              )}
              aria-label="Zoom in"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setFitMode('width')}
              className={cn(
                'px-2 py-1.5 rounded-lg text-[10px] font-bold border',
                btnInteractive,
                fitMode === 'width'
                  ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400'
                  : 'border-zinc-800 bg-zinc-900 text-zinc-400',
              )}
            >
              {t.print.fitWidth}
            </button>
            <button
              type="button"
              onClick={() => setFitMode('page')}
              className={cn(
                'px-2 py-1.5 rounded-lg text-[10px] font-bold border',
                btnInteractive,
                fitMode === 'page'
                  ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400'
                  : 'border-zinc-800 bg-zinc-900 text-zinc-400',
              )}
            >
              {t.print.fitPage}
            </button>
            <span className="text-[10px] font-mono text-zinc-500 ml-1 flex items-center gap-1">
              <Maximize2 className="w-3 h-3" />
              {fitMode === 'custom' ? `${Math.round(zoom * 100)}%` : fitMode}
            </span>
          </div>
        )}

        <div
          ref={stageRef}
          className="flex-1 relative rounded-2xl border border-zinc-900 overflow-auto min-h-[360px] bg-zinc-950/80"
        >
          <div className="absolute inset-0 opacity-[0.03] bg-[linear-gradient(rgba(255,255,255,0.6)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.6)_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />

          <div className="relative z-10 flex justify-center p-6 min-h-full">
            {file ? (
              <div className="relative my-auto">
                <div
                  className={cn(
                    'relative shadow-xl border border-zinc-800/40 bg-white rounded-sm overflow-hidden',
                    !pageIsColor && 'grayscale',
                    isRendering && 'opacity-80',
                  )}
                >
                  {isPdf && <canvas ref={canvasRef} className="block max-w-none" />}
                  {isImage && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={fileUrl}
                      alt="preview"
                      className="block max-w-full max-h-[480px] object-contain"
                      style={{
                        transform: `scale(${fitMode === 'custom' ? zoom : 1})`,
                        transformOrigin: 'top center',
                      }}
                    />
                  )}
                  {!isPdf && !isImage && (
                    <div className="p-10 text-center text-zinc-600 text-xs max-w-xs">
                      <Rows3 className="w-8 h-8 mx-auto mb-2" />
                      {t.print.officePreviewHint}
                    </div>
                  )}

                  {configBinding === 'spiral' && (
                    <div className="absolute left-0 top-0 bottom-0 w-4 flex flex-col justify-around py-2 pl-0.5 pointer-events-none z-10">
                      {Array.from({ length: 14 }).map((_, idx) => (
                        <div
                          key={idx}
                          className="w-3.5 h-1.5 bg-zinc-400 rounded-full -ml-1.5 border border-zinc-600/40"
                        />
                      ))}
                    </div>
                  )}
                  {(configBinding === 'stapled' || configBinding === 'glue') && (
                    <div className="absolute top-2.5 left-2.5 flex flex-col gap-2 pointer-events-none z-10">
                      <div className="w-4 h-0.5 bg-zinc-300 rounded border border-zinc-500 rotate-[40deg]" />
                      <div className="w-4 h-0.5 bg-zinc-300 rounded border border-zinc-500 rotate-[40deg]" />
                    </div>
                  )}
                </div>
                {isRendering && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-6 h-6 border-2 border-emerald-400/30 border-t-emerald-400 rounded-full animate-spin" />
                  </div>
                )}
              </div>
            ) : (
              <div className="m-auto text-center p-8 max-w-xs">
                <FileText className="w-10 h-10 text-zinc-600 mx-auto mb-3" />
                <p className="text-zinc-400 text-xs font-semibold leading-relaxed">
                  {t.print.previewEmpty}
                </p>
              </div>
            )}
          </div>
        </div>

        {file && (
          <div className="mt-3 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[11px] text-zinc-500 font-medium truncate">{file.name}</p>
              <p className="text-[11px] font-mono font-bold text-zinc-400 shrink-0">
                {isPdf ? (
                  <>
                    {t.print.pageOf} <span className="text-emerald-400">{activePage}</span>
                    <span className="text-zinc-600"> / {totalPages}</span>
                  </>
                ) : (
                  <span className="text-emerald-400">{t.print.imagePage}</span>
                )}
              </p>
            </div>

            {isPdf && totalPages > 1 && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={goPrev}
                  disabled={activePage <= 1 || isRendering}
                  className={cn(
                    'p-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300 disabled:opacity-40',
                    btnInteractive,
                  )}
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <input
                  type="number"
                  min={1}
                  max={totalPages}
                  value={activePage}
                  onChange={(e) =>
                    setCurrentPage(Math.min(totalPages, Math.max(1, Number(e.target.value) || 1)))
                  }
                  className="w-16 text-center bg-zinc-950 border border-zinc-800 rounded-lg text-xs py-2 text-white font-mono"
                />
                <button
                  type="button"
                  onClick={goNext}
                  disabled={activePage >= totalPages || isRendering}
                  className={cn(
                    'p-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300 disabled:opacity-40',
                    btnInteractive,
                  )}
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
                <div className="flex-1 overflow-x-auto flex gap-1">
                  {Array.from({ length: Math.min(totalPages, 12) }, (_, i) => i + 1).map((page) => (
                    <button
                      key={page}
                      type="button"
                      onClick={() => setCurrentPage(page)}
                      className={cn(
                        'min-w-7 h-7 px-1 rounded-md text-[10px] font-bold',
                        btnInteractive,
                        page === activePage
                          ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-400'
                          : 'bg-zinc-950 border border-zinc-800 text-zinc-500',
                      )}
                    >
                      {page}
                    </button>
                  ))}
                  {totalPages > 12 && (
                    <span className="text-[10px] text-zinc-600 self-center">…{totalPages}</span>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
