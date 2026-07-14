'use client';

import { FileText, Sparkles } from 'lucide-react';
import { RefObject } from 'react';

interface PrintPreviewProps {
  file: File | null;
  fileUrl: string;
  configColor: 'color' | 'bw';
  configBinding: 'none' | 'stapled' | 'spiral';
  canvasRef: RefObject<HTMLCanvasElement | null>;
  previewImgRef: RefObject<HTMLImageElement | null>;
}

export default function PrintPreview({
  file,
  fileUrl,
  configColor,
  configBinding,
  canvasRef,
  previewImgRef,
}: PrintPreviewProps) {
  return (
    <div className="glass-bezel-outer h-full">
      <div className="glass-bezel-inner p-6 flex flex-col h-full min-h-[480px]">
        <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-400 mb-4 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-emerald-400" /> Bản xem trước (Preview)
        </h3>

        {/* Preview Frame Wrapper */}
        <div className="flex-1 bg-zinc-950/60 border border-zinc-900 rounded-2xl flex items-center justify-center p-6 min-h-[280px] relative overflow-hidden">
          {file ? (
            <div
              className={`relative shadow-2xl transition-all duration-300 max-w-full max-h-[300px] border border-zinc-800/50 bg-white rounded ${
                configColor === 'bw' ? 'grayscale' : ''
              }`}
            >
              {/* PDF Canvas Rendering */}
              {file.type === 'application/pdf' && (
                <canvas ref={canvasRef} className="max-w-full max-h-[300px]" />
              )}

              {/* Image Preview Rendering */}
              {file.type.startsWith('image/') && (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  ref={previewImgRef}
                  src={fileUrl}
                  alt="image preview"
                  className="max-w-full max-h-[300px] object-contain"
                />
              )}

              {/* Dynamic CSS Overlay Spiral Rings */}
              {configBinding === 'spiral' && (
                <div className="absolute left-0 top-0 bottom-0 w-4 flex flex-col justify-around py-2 pl-0.5 bg-gradient-to-r from-zinc-400/40 to-transparent pointer-events-none border-r border-dashed border-zinc-400/20">
                  {Array.from({ length: 12 }).map((_, idx) => (
                    <div
                      key={idx}
                      className="w-3.5 h-1.5 bg-gradient-to-r from-zinc-300 to-zinc-500 rounded-full border border-zinc-600/55 -ml-1.5 shadow-md shadow-zinc-950/50"
                    />
                  ))}
                </div>
              )}

              {/* Dynamic CSS Overlay Staples */}
              {configBinding === 'stapled' && (
                <div className="absolute top-2 left-2 flex flex-col gap-1.5 pointer-events-none">
                  <div className="w-4 h-0.5 bg-zinc-300 rounded border border-zinc-500 shadow-sm rotate-[45deg]" />
                  <div className="w-4 h-0.5 bg-zinc-300 rounded border border-zinc-500 shadow-sm rotate-[45deg] mt-2" />
                </div>
              )}
            </div>
          ) : (
            <div className="text-center p-8">
              <FileText className="w-12 h-12 text-zinc-700 mx-auto mb-3" />
              <p className="text-zinc-500 text-xs font-semibold">
                Tải tài liệu lên ở khung bên trái để xem trước cấu hình in thực tế.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
