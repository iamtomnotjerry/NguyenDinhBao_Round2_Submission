'use client';

import { useEffect, useRef, useState } from 'react';
import { FileText, Sparkles, ChevronLeft, ChevronRight, Layers } from 'lucide-react';
import type { PDFDocumentProxy, RenderTask } from 'pdfjs-dist';
import { btnInteractive, cn } from '@/lib/utils';
import { useLocale } from '@/lib/i18n/context';

interface PrintPreviewProps {
  file: File | null;
  fileUrl: string;
  pdfDoc: PDFDocumentProxy | null;
  totalPages: number;
  configColor: 'color' | 'bw';
  configBinding: 'none' | 'stapled' | 'spiral';
  configPaperSize: 'a4' | 'a3' | 'a5';
}

const PAPER_LABEL = {
  a4: 'A4',
  a3: 'A3',
  a5: 'A5',
} as const;

export default function PrintPreview({
  file,
  fileUrl,
  pdfDoc,
  totalPages,
  configColor,
  configBinding,
  configPaperSize,
}: PrintPreviewProps) {
  const { t } = useLocale();
  const [currentPage, setCurrentPage] = useState(1);
  const [isRendering, setIsRendering] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const previewImgRef = useRef<HTMLImageElement>(null);

  const activePage = Math.min(Math.max(1, currentPage), Math.max(1, totalPages));

  // Render current PDF page
  useEffect(() => {
    if (!file || file.type !== 'application/pdf' || !pdfDoc || !canvasRef.current) return;

    let isCurrent = true;
    let activeRenderTask: RenderTask | null = null;

    const renderPage = async () => {
      setIsRendering(true);
      try {
        const pdfPage = await pdfDoc.getPage(activePage);
        if (!isCurrent) return;

        const canvas = canvasRef.current!;
        const context = canvas.getContext('2d')!;

        let scale = 1.15;
        if (configPaperSize === 'a3') scale = 1.35;
        if (configPaperSize === 'a5') scale = 0.85;

        const viewport = pdfPage.getViewport({ scale });
        canvas.width = viewport.width;
        canvas.height = viewport.height;

        context.fillStyle = '#ffffff';
        context.fillRect(0, 0, canvas.width, canvas.height);

        activeRenderTask = pdfPage.render({
          canvasContext: context,
          viewport,
        });

        await activeRenderTask.promise;
      } catch (err) {
        if (err instanceof Error && err.name === 'RenderingCancelledException') {
          // ignore cancel on page/config change
        } else {
          console.error('Error rendering PDF page:', err);
        }
      } finally {
        if (isCurrent) setIsRendering(false);
      }
    };

    renderPage();

    return () => {
      isCurrent = false;
      if (activeRenderTask) {
        activeRenderTask.cancel();
      }
    };
  }, [file, pdfDoc, activePage, configPaperSize]);

  const goPrev = () => setCurrentPage((p) => Math.max(1, Math.min(p, totalPages) - 1));
  const goNext = () => setCurrentPage((p) => Math.min(totalPages, Math.max(1, p) + 1));

  const isPdf = !!file && file.type === 'application/pdf';
  const isImage = !!file && file.type.startsWith('image/');
  const showPager = isPdf && totalPages > 1;

  // Quick page jump chips (cap at 8 visible for tidy UI)
  const pageChips = (() => {
    if (totalPages <= 8) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    const chips = new Set<number>([1, totalPages, activePage]);
    if (activePage > 1) chips.add(activePage - 1);
    if (activePage < totalPages) chips.add(activePage + 1);
    if (activePage > 2) chips.add(2);
    if (activePage < totalPages - 1) chips.add(totalPages - 1);
    return Array.from(chips).sort((a, b) => a - b);
  })();

  return (
    <div className="glass-bezel-outer h-full">
      <div className="glass-bezel-inner p-5 md:p-6 flex flex-col h-full min-h-[520px]">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 mb-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-400" /> {t.print.preview}
          </h3>
          {file && (
            <div className="flex items-center gap-1.5 flex-wrap justify-end">
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-400">
                {PAPER_LABEL[configPaperSize]}
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-400">
                {configColor === 'color' ? t.print.labelColor : t.print.labelBw}
              </span>
              {configBinding !== 'none' && (
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                  {configBinding === 'spiral' ? t.print.labelSpiral : t.print.labelStapled}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Preview stage */}
        <div className="flex-1 relative rounded-2xl border border-zinc-900 overflow-hidden min-h-[340px]">
          {/* Desk / ambient */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(16,185,129,0.06)_0%,_transparent_65%),linear-gradient(180deg,#09090b_0%,#050505_100%)]" />
          <div className="absolute inset-0 opacity-[0.035] bg-[linear-gradient(rgba(255,255,255,0.6)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.6)_1px,transparent_1px)] bg-[size:24px_24px]" />

          <div className="relative z-10 flex items-center justify-center p-6 md:p-8 h-full min-h-[340px]">
            {file ? (
              <div className="relative">
                {/* Stacked pages behind (multi-page cue) */}
                {isPdf && totalPages > 1 && (
                  <>
                    <div
                      className="absolute inset-0 translate-x-2 translate-y-2 rounded-sm bg-zinc-200/90 border border-zinc-300/80 shadow-lg pointer-events-none"
                      aria-hidden
                    />
                    {totalPages > 2 && (
                      <div
                        className="absolute inset-0 translate-x-3.5 translate-y-3.5 rounded-sm bg-zinc-300/70 border border-zinc-400/50 shadow pointer-events-none"
                        aria-hidden
                      />
                    )}
                  </>
                )}

                {/* Active page sheet */}
                <div
                  className={cn(
                    'relative shadow-[0_20px_50px_-12px_rgba(0,0,0,0.65)] border border-zinc-800/40 bg-white rounded-sm overflow-hidden transition-all duration-300',
                    configColor === 'bw' && 'grayscale',
                    isRendering && 'opacity-80',
                  )}
                >
                  {isPdf && (
                    <canvas
                      ref={canvasRef}
                      className="block max-w-[min(100%,280px)] md:max-w-[min(100%,320px)] max-h-[380px] w-auto h-auto"
                    />
                  )}

                  {isImage && (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      ref={previewImgRef}
                      src={fileUrl}
                      alt="image preview"
                      className="block max-w-[min(100%,280px)] md:max-w-[min(100%,320px)] max-h-[380px] object-contain"
                    />
                  )}

                  {/* Spiral binding */}
                  {configBinding === 'spiral' && (
                    <div className="absolute left-0 top-0 bottom-0 w-4 flex flex-col justify-around py-2 pl-0.5 bg-gradient-to-r from-zinc-400/45 to-transparent pointer-events-none border-r border-dashed border-zinc-400/25 z-10">
                      {Array.from({ length: 14 }).map((_, idx) => (
                        <div
                          key={idx}
                          className="w-3.5 h-1.5 bg-gradient-to-r from-zinc-200 to-zinc-500 rounded-full border border-zinc-600/50 -ml-1.5 shadow-md shadow-zinc-950/40"
                        />
                      ))}
                    </div>
                  )}

                  {/* Staples */}
                  {configBinding === 'stapled' && (
                    <div className="absolute top-2.5 left-2.5 flex flex-col gap-2 pointer-events-none z-10">
                      <div className="w-4 h-0.5 bg-zinc-300 rounded border border-zinc-500 shadow-sm rotate-[40deg]" />
                      <div className="w-4 h-0.5 bg-zinc-300 rounded border border-zinc-500 shadow-sm rotate-[40deg]" />
                    </div>
                  )}

                  {/* Page corner fold accent */}
                  <div
                    className="absolute top-0 right-0 w-0 h-0 border-t-[18px] border-l-[18px] border-t-zinc-100 border-l-transparent opacity-80 pointer-events-none"
                    aria-hidden
                  />
                </div>

                {isRendering && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-6 h-6 border-2 border-emerald-400/30 border-t-emerald-400 rounded-full animate-spin" />
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center p-8 max-w-xs">
                <div className="mx-auto mb-4 w-16 h-20 rounded-md border border-dashed border-zinc-700 bg-zinc-900/50 flex items-center justify-center relative">
                  <FileText className="w-7 h-7 text-zinc-600" />
                  <Layers className="w-3.5 h-3.5 text-emerald-500/60 absolute -bottom-1.5 -right-1.5" />
                </div>
                <p className="text-zinc-400 text-xs font-semibold leading-relaxed">
                  {t.print.previewEmpty}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Pager footer */}
        {file && (
          <div className="mt-4 space-y-3">
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

            {showPager && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={goPrev}
                  disabled={activePage <= 1 || isRendering}
                  aria-label="Trang trước"
                  className={cn(
                    'p-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white hover:border-zinc-700 disabled:opacity-40 disabled:pointer-events-none',
                    btnInteractive,
                  )}
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <div className="flex-1 flex items-center justify-center gap-1 flex-wrap">
                  {pageChips.map((page, idx) => {
                    const prev = pageChips[idx - 1];
                    const showGap = prev !== undefined && page - prev > 1;
                    return (
                      <span key={page} className="contents">
                        {showGap && <span className="text-zinc-600 text-[10px] px-0.5">…</span>}
                        <button
                          type="button"
                          onClick={() => setCurrentPage(page)}
                          disabled={isRendering}
                          className={cn(
                            'min-w-8 h-8 px-2 rounded-lg text-[11px] font-bold',
                            btnInteractive,
                            page === activePage
                              ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-400'
                              : 'bg-zinc-950 border border-zinc-850 text-zinc-500 hover:text-zinc-300 hover:border-zinc-700',
                          )}
                        >
                          {page}
                        </button>
                      </span>
                    );
                  })}
                </div>

                <button
                  type="button"
                  onClick={goNext}
                  disabled={activePage >= totalPages || isRendering}
                  aria-label="Trang sau"
                  className={cn(
                    'p-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white hover:border-zinc-700 disabled:opacity-40 disabled:pointer-events-none',
                    btnInteractive,
                  )}
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
