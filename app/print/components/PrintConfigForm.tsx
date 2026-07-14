'use client';

import { FileText, UploadCloud, Settings, MapPin, Printer, RefreshCw } from 'lucide-react';
import { RefObject } from 'react';
import { btnInteractive, cn } from '@/lib/utils';

interface PrintConfigFormProps {
  file: File | null;
  fileName: string;
  totalPages: number;
  isUploading: boolean;
  configColor: 'color' | 'bw';
  setConfigColor: (color: 'color' | 'bw') => void;
  configCopies: number;
  setConfigCopies: (copies: number) => void;
  configPaperSize: 'a4' | 'a3' | 'a5';
  setConfigPaperSize: (size: 'a4' | 'a3' | 'a5') => void;
  configBinding: 'none' | 'stapled' | 'spiral';
  setConfigBinding: (binding: 'none' | 'stapled' | 'spiral') => void;
  printerLocation: string;
  setPrinterLocation: (loc: string) => void;
  submitting: boolean;
  handleUploadClick: () => void;
  handlePrintSubmit: () => void;
  calculateCost: () => number;
  fileInputRef: RefObject<HTMLInputElement | null>;
  handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export default function PrintConfigForm({
  file,
  fileName,
  totalPages,
  isUploading,
  configColor,
  setConfigColor,
  configCopies,
  setConfigCopies,
  configPaperSize,
  setConfigPaperSize,
  configBinding,
  setConfigBinding,
  printerLocation,
  setPrinterLocation,
  submitting,
  handleUploadClick,
  handlePrintSubmit,
  calculateCost,
  fileInputRef,
  handleFileChange,
}: PrintConfigFormProps) {
  return (
    <div className="lg:col-span-7 space-y-8">
      <div className="glass-bezel-outer">
        <div className="glass-bezel-inner p-8 space-y-6">
          <h2 className="text-2xl font-bold bg-gradient-to-r from-white to-zinc-300 bg-clip-text text-transparent flex items-center gap-2">
            <Printer className="w-6 h-6 text-emerald-400" /> Gửi lệnh in từ xa
          </h2>

          {/* File Upload Slot */}
          <div
            onClick={handleUploadClick}
            className={cn(
              'border-2 border-dashed border-zinc-800 rounded-2xl p-8 text-center hover:border-emerald-500/50 hover:bg-emerald-500/5 relative overflow-hidden group',
              btnInteractive,
              file && 'bg-zinc-900/20',
            )}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              className="hidden"
              accept="application/pdf,image/*"
            />
            {isUploading ? (
              <div className="flex flex-col items-center space-y-2">
                <RefreshCw className="w-10 h-10 text-emerald-400 animate-spin" />
                <p className="text-zinc-400 text-sm font-semibold">Đang quét tài liệu...</p>
              </div>
            ) : file ? (
              <div className="flex flex-col items-center space-y-2">
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 mb-1">
                  <FileText className="w-8 h-8" />
                </div>
                <p className="text-white text-sm font-bold truncate max-w-xs">{fileName}</p>
                <p className="text-zinc-500 text-xs font-semibold">
                  {(file.size / 1024 / 1024).toFixed(2)} MB • {totalPages} trang
                </p>
                <button
                  type="button"
                  className={cn(
                    'text-emerald-400 hover:text-emerald-300 text-xs font-bold pt-2 underline',
                    btnInteractive,
                  )}
                >
                  Chọn tệp khác
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center space-y-2">
                <UploadCloud className="w-10 h-10 text-zinc-550 group-hover:text-emerald-400 transition-colors" />
                <p className="text-zinc-300 text-sm font-bold">
                  Kéo thả hoặc click để upload tài liệu
                </p>
                <p className="text-zinc-500 text-xs font-semibold">Hỗ trợ PDF hoặc Hình ảnh</p>
              </div>
            )}
          </div>

          {/* Configurations Panel */}
          <div className="space-y-5 pt-4 border-t border-zinc-900">
            <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-2">
              <Settings className="w-4 h-4 text-zinc-500" /> Cấu hình bản in
            </h3>

            {/* Config Color/BW */}
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setConfigColor('color')}
                className={cn(
                  'p-4 rounded-xl border font-bold text-sm flex flex-col items-center gap-1',
                  btnInteractive,
                  configColor === 'color'
                    ? 'border-emerald-500 bg-emerald-500/5 text-white shadow shadow-emerald-950/20'
                    : 'border-zinc-800 hover:border-zinc-700 text-zinc-400',
                )}
              >
                <span className="bg-gradient-to-r from-red-500 via-green-500 to-blue-500 w-4 h-4 rounded-full" />
                In màu ($0.5/trang)
              </button>
              <button
                type="button"
                onClick={() => setConfigColor('bw')}
                className={cn(
                  'p-4 rounded-xl border font-bold text-sm flex flex-col items-center gap-1',
                  btnInteractive,
                  configColor === 'bw'
                    ? 'border-emerald-500 bg-emerald-500/5 text-white shadow shadow-emerald-950/20'
                    : 'border-zinc-800 hover:border-zinc-700 text-zinc-400',
                )}
              >
                <span className="bg-zinc-500 w-4 h-4 rounded-full" />
                Đen trắng ($0.1/trang)
              </button>
            </div>

            {/* Config Copies & Paper Size */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">
                  Số lượng bản in
                </label>
                <input
                  type="number"
                  min="1"
                  value={configCopies}
                  onChange={(e) => setConfigCopies(Math.max(1, parseInt(e.target.value, 10) || 1))}
                  className="w-full bg-zinc-950 border border-zinc-800 hover:border-zinc-700 focus:border-emerald-500 py-3 px-4 rounded-xl text-sm focus:outline-none transition-all text-white font-bold"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">
                  Khổ giấy
                </label>
                <select
                  value={configPaperSize}
                  onChange={(e) => setConfigPaperSize(e.target.value as 'a4' | 'a3' | 'a5')}
                  className="w-full bg-zinc-950 border border-zinc-800 hover:border-zinc-700 focus:border-emerald-500 py-3 px-4 rounded-xl text-sm focus:outline-none transition-all text-white font-bold"
                >
                  <option value="a4">Khổ A4 (Chuẩn)</option>
                  <option value="a3">Khổ A3 (Bản to)</option>
                  <option value="a5">Khổ A5 (Sách nhỏ)</option>
                </select>
              </div>
            </div>

            {/* Config Binding Options */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">
                Gia công đóng gáy
              </label>
              <div className="grid grid-cols-3 gap-3">
                {(['none', 'stapled', 'spiral'] as const).map((b) => (
                  <button
                    key={b}
                    type="button"
                    onClick={() => setConfigBinding(b)}
                    className={cn(
                      'py-3 px-2 rounded-xl border text-xs font-bold capitalize',
                      btnInteractive,
                      configBinding === b
                        ? 'border-emerald-500 bg-emerald-500/5 text-white shadow shadow-emerald-950/20'
                        : 'border-zinc-800 hover:border-zinc-700 text-zinc-400',
                    )}
                  >
                    {b === 'none' && 'Không đóng gáy'}
                    {b === 'stapled' && 'Dập ghim (+ $0.5)'}
                    {b === 'spiral' && 'Gáy lò xo (+ $2)'}
                  </button>
                ))}
              </div>
            </div>

            {/* Select Location */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">
                Địa điểm máy in nhận tài liệu
              </label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-400" />
                <select
                  value={printerLocation}
                  onChange={(e) => setPrinterLocation(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-zinc-950 border border-zinc-800 hover:border-zinc-700 focus:border-emerald-500 rounded-xl text-sm focus:outline-none transition-all text-white font-bold"
                >
                  <option value="Cửa hàng A - Quận 1, TPHCM">
                    Cửa hàng A - Quận 1, TPHCM (Mở cửa 24/7)
                  </option>
                  <option value="Bưu cục Plat - Quận Cầu Giấy, HN">
                    Bưu cục Plat - Quận Cầu Giấy, HN (Mở cửa 8h - 20h)
                  </option>
                  <option value="Bưu điện Trung tâm - Quận Hải Châu, ĐN">
                    Bưu điện Trung tâm - Quận Hải Châu, ĐN
                  </option>
                </select>
              </div>
            </div>
          </div>

          {/* Cost Summary & Start print button */}
          <div className="pt-4 border-t border-zinc-900 space-y-4">
            <div className="flex justify-between items-center text-sm font-semibold">
              <span className="text-zinc-400">Ước tính giá lệnh in:</span>
              <span className="text-xl font-bold text-white">${calculateCost().toFixed(2)}</span>
            </div>

            <button
              onClick={handlePrintSubmit}
              disabled={!file || submitting || isUploading}
              className={cn(
                'w-full py-4 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 disabled:opacity-50 disabled:pointer-events-none rounded-xl font-bold text-sm shadow-lg shadow-emerald-500/10 flex items-center justify-center gap-2 hover:scale-[1.01]',
                btnInteractive,
              )}
            >
              {submitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" /> Đang xử lý thanh toán...
                </>
              ) : (
                <>
                  <Printer className="w-4 h-4" /> Bắt đầu in ấn ($
                  {calculateCost().toFixed(2)})
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
