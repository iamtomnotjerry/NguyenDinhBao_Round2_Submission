'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { easeOutExpo } from '@/lib/motion';
import {
  FileText,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Rows3,
  ScanLine,
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
  const reduce = useReducedMotion();
  const [isRendering, setIsRendering] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [fitMode, setFitMode] = useState<FitMode>('page');
  const [stageTick, setStageTick] = useState(0);
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
      if (!pdfDoc || !stageRef.current) return 1.4;
      const pdfPage = await pdfDoc.getPage(pageNum);
      const base = pdfPage.getViewport({ scale: 1 });
      const pad = 56;
      const availW = Math.max(280, stageRef.current.clientWidth - pad);
      const availH = Math.max(320, stageRef.current.clientHeight - pad);

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
  }, [file, pdfDoc, activePage, computeScale, configPaperSize, stageTick]);

  useEffect(() => {
    if (!stageRef.current || typeof ResizeObserver === 'undefined') return;
    let raf = 0;
    const ro = new ResizeObserver(() => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => setStageTick((n) => n + 1));
    });
    ro.observe(stageRef.current);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, []);

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

  const toolBtn = (active?: boolean) =>
    cn(
      'inline-flex items-center justify-center gap-1.5 h-9 px-3 rounded-lg text-[11px] font-semibold border transition-colors',
      btnInteractive,
      active
        ? 'border-emerald-500/45 bg-emerald-500/15 text-emerald-300'
        : 'border-white/8 bg-elevated/60 text-secondary hover:text-secondary-strong hover:border-white/15',
    );

  return (
    <motion.div
      className="glass-bezel-outer overflow-hidden"
      initial={reduce ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.45, ease: easeOutExpo }}
    >
      <div className="glass-bezel-inner flex flex-col min-h-[420px] lg:min-h-[calc(100vh-6.5rem)] lg:max-h-[calc(100vh-5.5rem)]">
        {/* Chrome bar */}
        <motion.div
          className="shrink-0 flex flex-wrap items-center justify-between gap-3 px-4 md:px-5 py-3 border-b border-white/6 bg-elevated/40"
          initial={reduce ? false : { opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: easeOutExpo, delay: 0.06 }}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/12 border border-emerald-500/25 text-emerald-400 shrink-0">
              <ScanLine className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-fg">
                {t.print.preview}
              </p>
              <p className="text-sm font-semibold text-fg truncate">
                {file ? file.name : t.print.previewEmpty.split('.')[0]}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md bg-muted/80 border border-white/8 text-secondary">
              {PAPER_SIZE_LABELS[configPaperSize]}
            </span>
            <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md bg-muted/80 border border-white/8 text-secondary">
              {pageIsColor ? t.print.labelColor : t.print.labelBw}
            </span>
            {configBinding !== 'none' && (
              <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/25 text-emerald-400">
                {configBinding}
              </span>
            )}
          </div>
        </motion.div>

        {/* Toolbar */}
        {file && isPdf && (
          <motion.div
            className="shrink-0 flex items-center gap-1.5 px-4 md:px-5 py-2.5 border-b border-white/5 bg-elevated/25 overflow-x-auto"
            initial={reduce ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.35, ease: easeOutExpo, delay: 0.1 }}
          >
            <button
              type="button"
              onClick={zoomOut}
              className={toolBtn()}
              aria-label={t.print.zoomOut}
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={zoomIn}
              className={toolBtn()}
              aria-label={t.print.zoomIn}
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <div className="w-px h-5 bg-fg/10 mx-0.5" />
            <button
              type="button"
              onClick={() => setFitMode('width')}
              className={toolBtn(fitMode === 'width')}
            >
              {t.print.fitWidth}
            </button>
            <button
              type="button"
              onClick={() => setFitMode('page')}
              className={toolBtn(fitMode === 'page')}
            >
              {t.print.fitPage}
            </button>
            <span className="ml-auto text-[11px] font-mono text-muted-fg flex items-center gap-1.5 tabular-nums">
              <Maximize2 className="w-3.5 h-3.5" />
              {fitMode === 'custom' ? `${Math.round(zoom * 100)}%` : fitMode}
            </span>
          </motion.div>
        )}

        {/* Light table / desk */}
        <div
          ref={stageRef}
          className="print-light-table relative flex-1 min-h-[340px] md:min-h-[480px] overflow-auto"
        >
          <div className="relative z-[1] flex min-h-full w-full items-center justify-center p-6 md:p-10 lg:p-12">
            {file ? (
              <div className="relative my-auto">
                {/* Soft drop under sheet */}
                <div
                  aria-hidden
                  className="pointer-events-none absolute -inset-x-6 -bottom-8 top-[40%] rounded-[40%] bg-black/45 blur-2xl opacity-70"
                />
                <motion.div
                  className={cn(
                    'print-sheet relative bg-paper overflow-hidden',
                    !pageIsColor && 'grayscale',
                  )}
                  animate={{ opacity: isRendering ? 0.88 : 1 }}
                  transition={{ duration: 0.22, ease: easeOutExpo }}
                >
                  {isPdf && <canvas ref={canvasRef} className="block max-w-none" />}
                  {isImage && (
                    // Blob / object URLs — next/image requires unoptimized
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={fileUrl}
                      alt={t.print.preview}
                      className="block max-w-[min(100%,720px)] max-h-[min(70vh,720px)] object-contain"
                      style={{
                        transform: `scale(${fitMode === 'custom' ? zoom : 1})`,
                        transformOrigin: 'top center',
                      }}
                    />
                  )}
                  {!isPdf && !isImage && (
                    <div className="flex flex-col items-center justify-center gap-3 px-14 py-20 text-center text-muted-fg">
                      <Rows3 className="w-10 h-10 text-secondary" />
                      <p className="text-sm font-medium max-w-sm text-faint">
                        {t.print.officePreviewHint}
                      </p>
                    </div>
                  )}

                  {configBinding === 'spiral' && (
                    <div className="absolute left-0 top-0 bottom-0 w-5 flex flex-col justify-around py-3 pl-0.5 pointer-events-none z-10">
                      {Array.from({ length: 18 }).map((_, idx) => (
                        <div
                          key={idx}
                          className="w-4 h-1.5 bg-paper-spine/90 rounded-full -ml-2 border border-paper-muted/30 shadow-sm"
                        />
                      ))}
                    </div>
                  )}
                  {(configBinding === 'stapled' || configBinding === 'glue') && (
                    <div className="absolute top-3 left-3 flex flex-col gap-2.5 pointer-events-none z-10">
                      <div className="w-5 h-0.5 bg-paper-spine rounded border border-paper-muted/50 rotate-[38deg] shadow-sm" />
                      <div className="w-5 h-0.5 bg-paper-spine rounded border border-paper-muted/50 rotate-[38deg] shadow-sm" />
                    </div>
                  )}
                </motion.div>

                {isRendering && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-8 h-8 border-2 border-emerald-400/25 border-t-emerald-400 rounded-full animate-spin" />
                  </div>
                )}
              </div>
            ) : (
              <motion.div
                className="w-full max-w-3xl mx-auto"
                initial={reduce ? false : { opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: easeOutExpo, delay: 0.08 }}
              >
                <div className="relative mx-auto aspect-[3/2] max-h-[min(52vh,520px)] w-full">
                  <div className="absolute inset-[8%] rounded-sm border border-dashed border-paper-spine/35 bg-paper/[0.03]" />
                  <div className="absolute inset-[14%] rounded-sm bg-paper shadow-[0_24px_60px_-20px_rgba(0,0,0,0.75)] border border-paper-rule/90 flex flex-col items-center justify-center gap-4 px-8 text-center">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-paper-soft text-muted-fg">
                      <FileText className="w-7 h-7" />
                    </div>
                    <div className="space-y-1.5 max-w-md">
                      <p className="text-base font-semibold text-paper-ink">{t.print.preview}</p>
                      <p className="text-sm text-muted-fg leading-relaxed">
                        {t.print.previewEmpty}
                      </p>
                    </div>
                  </div>
                  {/* Aspect guides */}
                  <div
                    aria-hidden
                    className="absolute left-[8%] right-[8%] top-1/2 h-px bg-emerald-500/20"
                  />
                  <div
                    aria-hidden
                    className="absolute top-[8%] bottom-[8%] left-1/2 w-px bg-emerald-500/20"
                  />
                </div>
              </motion.div>
            )}
          </div>
        </div>

        {/* Filmstrip / pager */}
        {file && (
          <div className="shrink-0 border-t border-white/6 bg-elevated/55 px-4 md:px-5 py-3 space-y-2.5">
            <div className="flex items-center justify-between gap-3">
              <p className="text-[11px] text-muted-fg font-medium truncate">{file.name}</p>
              <p className="text-[12px] font-mono font-bold text-secondary shrink-0 tabular-nums">
                {isPdf ? (
                  <>
                    {t.print.pageOf} <span className="text-emerald-400">{activePage}</span>
                    <span className="text-faint"> / {totalPages}</span>
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
                    'h-9 w-9 rounded-lg bg-muted border border-white/8 text-secondary-strong disabled:opacity-35',
                    btnInteractive,
                  )}
                >
                  <ChevronLeft className="w-4 h-4 mx-auto" />
                </button>
                <input
                  type="number"
                  min={1}
                  max={totalPages}
                  value={activePage}
                  onChange={(e) =>
                    setCurrentPage(Math.min(totalPages, Math.max(1, Number(e.target.value) || 1)))
                  }
                  className="w-14 text-center bg-elevated border border-white/8 rounded-lg text-xs py-2 text-fg font-mono"
                />
                <button
                  type="button"
                  onClick={goNext}
                  disabled={activePage >= totalPages || isRendering}
                  className={cn(
                    'h-9 w-9 rounded-lg bg-muted border border-white/8 text-secondary-strong disabled:opacity-35',
                    btnInteractive,
                  )}
                >
                  <ChevronRight className="w-4 h-4 mx-auto" />
                </button>
                <div className="flex-1 overflow-x-auto flex gap-1.5 py-0.5">
                  {Array.from({ length: Math.min(totalPages, 16) }, (_, i) => i + 1).map((page) => (
                    <button
                      key={page}
                      type="button"
                      onClick={() => setCurrentPage(page)}
                      className={cn(
                        'min-w-8 h-9 px-1.5 rounded-md text-[11px] font-bold border',
                        btnInteractive,
                        page === activePage
                          ? 'bg-emerald-500/15 border-emerald-500/35 text-emerald-300'
                          : 'bg-elevated border-white/8 text-muted-fg hover:text-secondary-strong',
                      )}
                    >
                      {page}
                    </button>
                  ))}
                  {totalPages > 16 && (
                    <span className="text-[11px] text-faint self-center px-1">…{totalPages}</span>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}
