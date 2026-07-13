'use client';

import { useState, useRef, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { SafeDatabase } from '@/types/database.types';
import { User as SupabaseUser } from '@supabase/supabase-js';
import Header from '@/components/Header';
import {
  FileText,
  UploadCloud,
  Settings,
  MapPin,
  Printer,
  Sparkles,
  RefreshCw,
  ArrowRight,
} from 'lucide-react';
import Link from 'next/link';
import { calculatePrintCost } from '@/lib/utils';

type PrintJob = SafeDatabase['public']['Tables']['print_jobs']['Row'];

export default function PrintPage() {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [loading, setLoading] = useState(true);

  // File states
  const [file, setFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState('');
  const [fileUrl, setFileUrl] = useState('');
  const [totalPages, setTotalPages] = useState(1);
  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  const [pdfjsLib, setPdfjsLib] = useState<any>(null);
  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  const [pdfDoc, setPdfDoc] = useState<any>(null);

  // Load pdfjs-dist dynamically on client side only
  useEffect(() => {
    if (typeof window !== 'undefined') {
      import('pdfjs-dist').then((pdfjs) => {
        pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.mjs`;
        setPdfjsLib(pdfjs);
      });
    }
  }, []);

  // Configurations
  const [configColor, setConfigColor] = useState<'color' | 'bw'>('color');
  const [configCopies, setConfigCopies] = useState<number>(1);
  const [configPaperSize, setConfigPaperSize] = useState<'a4' | 'a3' | 'a5'>('a4');
  const [configBinding, setConfigBinding] = useState<'none' | 'stapled' | 'spiral'>('none');
  const [printerLocation, setPrinterLocation] = useState('Cửa hàng A - Quận 1, TPHCM');

  // Flow control states
  const [isUploading, setIsUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [activeJob, setActiveJob] = useState<PrintJob | null>(null);
  const [printProgress, setPrintProgress] = useState(0);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const previewImgRef = useRef<HTMLImageElement>(null);

  // Check auth state
  useEffect(() => {
    const checkUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUser(user);
      setLoading(false);
    };
    checkUser();
  }, []);

  // Handle PDF rendering inside Canvas on config change
  useEffect(() => {
    if (!file || file.type !== 'application/pdf' || !pdfDoc || !canvasRef.current) return;

    let isCurrent = true;
    /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
    let activeRenderTask: any = null;

    const renderPage = async () => {
      try {
        const page = await pdfDoc.getPage(1);
        if (!isCurrent) return;

        const canvas = canvasRef.current!;
        const context = canvas.getContext('2d')!;

        // Adjust scale based on paper size A3/A4/A5
        let scale = 1.0;
        if (configPaperSize === 'a3') scale = 1.3;
        if (configPaperSize === 'a5') scale = 0.7;

        const viewport = page.getViewport({ scale });
        canvas.width = viewport.width;
        canvas.height = viewport.height;

        activeRenderTask = page.render({
          canvasContext: context,
          viewport: viewport,
        });

        await activeRenderTask.promise;
      } catch (err) {
        if (err instanceof Error && err.name === 'RenderingCancelledException') {
          // Safe to ignore on component cleanup / config change
        } else {
          console.error('Error rendering PDF page:', err);
        }
      }
    };

    renderPage();

    return () => {
      isCurrent = false;
      if (activeRenderTask) {
        activeRenderTask.cancel();
      }
    };
  }, [file, pdfDoc, configPaperSize]);

  // Handle File Selection
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setFileName(selectedFile.name);
    setPdfDoc(null);
    setTotalPages(1);

    // If PDF, count pages and render preview
    if (selectedFile.type === 'application/pdf' && pdfjsLib) {
      setIsUploading(true);
      try {
        const fileReader = new FileReader();
        fileReader.onload = async function () {
          try {
            const typedarray = new Uint8Array(this.result as ArrayBuffer);
            const loadingTask = pdfjsLib.getDocument({ data: typedarray });
            const pdf = await loadingTask.promise;
            setPdfDoc(pdf);
            setTotalPages(pdf.numPages);
          } catch (err) {
            console.error('Error loading PDF:', err);
          } finally {
            setIsUploading(false);
          }
        };
        fileReader.readAsArrayBuffer(selectedFile);
      } catch (err) {
        console.error('FileReader error:', err);
        setIsUploading(false);
      }
    } else if (selectedFile.type.startsWith('image/')) {
      // If Image, generate object URL for preview
      const url = URL.createObjectURL(selectedFile);
      setFileUrl(url);
    }
  };

  // Trigger File Input Click
  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  // Submit print job and initiate simulation
  const handlePrintSubmit = async () => {
    if (!file || !user) return;
    setSubmitting(true);
    setPrintProgress(0);

    try {
      // 1. Upload file to Supabase Storage
      const fileExt = file.name.split('.').pop();
      const uniqueFileName = `${user.id}_${Date.now()}.${fileExt}`;
      const filePath = `print_jobs/${uniqueFileName}`;

      const { error: uploadError } = await supabase.storage
        .from('print-files')
        .upload(filePath, file, { cacheControl: '3600', upsert: true });

      if (uploadError) throw new Error(`Không thể upload file: ${uploadError.message}`);

      // [SECURITY FIX]: Use createSignedUrl instead of getPublicUrl to prevent IDOR bypass.
      // getPublicUrl generates a direct HTTP URL that bypasses RLS entirely on public buckets.
      // createSignedUrl generates a time-limited, authenticated URL that respects bucket privacy.
      const { data: signedUrlData, error: signedUrlError } = await supabase.storage
        .from('print-files')
        .createSignedUrl(filePath, 86400); // 24 hours expiry

      if (signedUrlError || !signedUrlData?.signedUrl) {
        throw new Error('Không thể tạo URL truy cập tệp in. Vui lòng thử lại.');
      }
      const secureFileUrl = signedUrlData.signedUrl;

      // 2. Call local Print Job API route (which initializes database & triggers simulator background loop)
      const res = await fetch('/api/print-jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          file_name: fileName,
          file_url: secureFileUrl,
          config_color: configColor,
          config_copies: configCopies,
          config_paper_size: configPaperSize,
          config_binding: configBinding,
          total_pages: totalPages,
          printer_location: printerLocation,
        }),
      });

      const jobData = await res.json();
      if (!res.ok) throw new Error(jobData.error || 'Lỗi khi khởi tạo đơn in');

      setActiveJob(jobData);

      // 3. Listen to Realtime Database replication updates
      const channel = supabase
        .channel(`print-job-progress-${jobData.id}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'print_jobs',
            filter: `id=eq.${jobData.id}`,
          },
          (payload) => {
            const updatedJob = payload.new as PrintJob;
            setActiveJob(updatedJob);

            // Map status to progress bar percentage
            if (updatedJob.status === 'pending') setPrintProgress(10);
            else if (updatedJob.status === 'rendering') setPrintProgress(40);
            else if (updatedJob.status === 'printing') setPrintProgress(70);
            else if (updatedJob.status === 'completed') {
              setPrintProgress(100);
              // Clean up channel subscription
              supabase.removeChannel(channel);
            } else if (updatedJob.status === 'failed') {
              setPrintProgress(0);
              supabase.removeChannel(channel);
            }
          },
        )
        .subscribe();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Đã xảy ra lỗi ngoài ý muốn.');
    } finally {
      setSubmitting(false);
    }
  };

  const calculateCost = () => {
    return calculatePrintCost(totalPages, configCopies, configColor, configBinding);
  };

  return (
    <div className="flex flex-col min-h-screen bg-zinc-950 text-white font-sans selection:bg-indigo-500 selection:text-white">
      <Header />

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <RefreshCw className="w-8 h-8 animate-spin text-indigo-500" />
        </div>
      ) : (
        /* Main Container */
        <main className="flex-1 max-w-6xl mx-auto px-6 py-12 w-full grid grid-cols-1 lg:grid-cols-12 gap-8 relative z-10">
          {!user ? (
            /* Unauthorized Banner */
            <div className="lg:col-span-12 flex flex-col items-center justify-center p-16 glass-panel rounded-3xl border border-zinc-800 text-center space-y-6">
              <div className="p-4 bg-indigo-500/10 rounded-full text-indigo-400 border border-indigo-500/20">
                <Printer className="w-12 h-12" />
              </div>
              <h2 className="text-2xl font-bold">Vui lòng đăng nhập để bắt đầu in ấn</h2>
              <p className="text-zinc-400 max-w-md">
                Để upload tài liệu PDF, cấu hình in, theo dõi tiến độ in realtime và tích lũy điểm
                thưởng, bạn cần có tài khoản PlatPrint.
              </p>
              <Link
                href="/auth"
                className="px-8 py-4 bg-gradient-to-r from-indigo-500 to-violet-500 hover:from-indigo-600 hover:to-violet-600 rounded-xl font-bold transition-transform hover:scale-[1.02] flex items-center gap-2"
              >
                Đăng nhập / Đăng ký ngay <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          ) : activeJob ? (
            /* Printing Queue Simulation Screen */
            <div className="lg:col-span-12 glass-panel p-8 rounded-3xl border border-zinc-800 flex flex-col items-center justify-center min-h-[500px] text-center space-y-8">
              <div className="relative">
                {/* Dynamic print loader animation */}
                <div
                  className={`w-24 h-24 rounded-full border-4 transition-all duration-700 ${
                    activeJob.status === 'completed'
                      ? 'border-emerald-500/20 border-t-emerald-500'
                      : activeJob.status === 'failed'
                        ? 'border-red-500/20 border-t-red-500'
                        : 'border-indigo-500/10 border-t-indigo-500 animate-spin'
                  }`}
                />
                <Printer
                  className={`w-8 h-8 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 transition-colors duration-700 ${
                    activeJob.status === 'completed'
                      ? 'text-emerald-400'
                      : activeJob.status === 'failed'
                        ? 'text-red-400'
                        : 'text-indigo-400'
                  }`}
                />
              </div>

              <div className="space-y-3">
                <h2 className="text-2xl font-bold bg-gradient-to-r from-white to-zinc-300 bg-clip-text text-transparent">
                  {activeJob.status === 'pending' && 'Đang gửi lệnh in tới máy in...'}
                  {activeJob.status === 'rendering' &&
                    'Máy in đang chuẩn bị tài liệu (Rendering)...'}
                  {activeJob.status === 'printing' && 'Máy in đang chạy (Printing)...'}
                  {activeJob.status === 'completed' && 'Hoàn thành in ấn thành công!'}
                  {activeJob.status === 'failed' && 'Lỗi in ấn máy in vật lý'}
                </h2>
                <p className="text-zinc-500 text-sm">
                  ID lệnh in: <span className="font-mono text-zinc-300">{activeJob.id}</span>
                </p>
              </div>

              {/* Progress Bar Container */}
              <div className="w-full max-w-lg space-y-2">
                <div className="w-full bg-zinc-900 h-3 rounded-full overflow-hidden border border-zinc-800">
                  <div
                    className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all duration-500 rounded-full"
                    style={{ width: `${printProgress}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-zinc-500 font-semibold uppercase tracking-wider">
                  <span>{printProgress}%</span>
                  <span>Trạng thái: {activeJob.status}</span>
                </div>
              </div>

              {/* Status logs */}
              <div className="w-full max-w-md p-4 bg-zinc-950/50 border border-zinc-900 rounded-2xl text-left space-y-3 text-sm text-zinc-400">
                <div className="flex items-center justify-between border-b border-zinc-900 pb-2">
                  <span className="font-semibold text-white">Lịch sử sự kiện in ấn</span>
                  <span className="text-xs px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 font-bold border border-indigo-500/10">
                    Realtime
                  </span>
                </div>
                <div className="space-y-2 font-mono text-xs">
                  <div className="flex items-start gap-2">
                    <span className="text-indigo-400">[✓]</span>
                    <span>Lệnh in đã khởi tạo thành công ($ {activeJob.cost})</span>
                  </div>
                  {printProgress >= 40 && (
                    <div className="flex items-start gap-2">
                      <span className="text-indigo-400">[✓]</span>
                      <span>
                        Nạp tài liệu & render preview hoàn tất (1 / {activeJob.total_pages} trang)
                      </span>
                    </div>
                  )}
                  {printProgress >= 70 && (
                    <div className="flex items-start gap-2">
                      <span className="text-indigo-400">[⚙]</span>
                      <span>
                        Đang phun mực & cán giấy (
                        {activeJob.config_color === 'color' ? 'In màu' : 'Đen trắng'})
                      </span>
                    </div>
                  )}
                  {printProgress === 100 && (
                    <div className="flex items-start gap-2 text-emerald-400 font-semibold">
                      <span className="text-emerald-400">[✓]</span>
                      <span>
                        Máy in đã hoàn thành in. Vui lòng nhận tài liệu tại{' '}
                        {activeJob.printer_location}.
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {activeJob.status === 'completed' && (
                <button
                  onClick={() => {
                    setActiveJob(null);
                    setFile(null);
                    setFileName('');
                  }}
                  className="px-6 py-3 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 font-bold rounded-xl transition-all flex items-center gap-2 text-sm text-white"
                >
                  In tài liệu mới <ArrowRight className="w-4 h-4 text-indigo-400" />
                </button>
              )}
            </div>
          ) : (
            /* Standard Remote Printing Form & Preview */
            <>
              {/* Left Column: Config Forms (7 cols) */}
              <div className="lg:col-span-7 space-y-8">
                <div className="glass-panel p-8 rounded-3xl border border-zinc-800 space-y-6">
                  <h2 className="text-2xl font-bold bg-gradient-to-r from-white to-zinc-300 bg-clip-text text-transparent flex items-center gap-2">
                    <Printer className="w-6 h-6 text-indigo-400" /> Gửi lệnh in từ xa
                  </h2>

                  {/* File Upload Slot */}
                  <div
                    onClick={handleUploadClick}
                    className={`border-2 border-dashed border-zinc-800 rounded-2xl p-8 text-center cursor-pointer hover:border-indigo-500/50 hover:bg-indigo-500/5 transition-all relative overflow-hidden group ${
                      file ? 'bg-zinc-900/20' : ''
                    }`}
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
                        <RefreshCw className="w-10 h-10 text-indigo-400 animate-spin" />
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
                        <button className="text-indigo-400 hover:text-indigo-300 text-xs font-bold pt-2 underline transition-colors">
                          Chọn tệp khác
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center space-y-2">
                        <UploadCloud className="w-10 h-10 text-zinc-500 group-hover:text-indigo-400 transition-colors" />
                        <p className="text-zinc-300 text-sm font-bold">
                          Kéo thả hoặc click để upload tài liệu
                        </p>
                        <p className="text-zinc-500 text-xs font-semibold">
                          Hỗ trợ PDF hoặc Hình ảnh
                        </p>
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
                        onClick={() => setConfigColor('color')}
                        className={`p-4 rounded-xl border font-bold text-sm transition-all flex flex-col items-center gap-1 ${
                          configColor === 'color'
                            ? 'border-indigo-500 bg-indigo-500/5 text-white'
                            : 'border-zinc-800 hover:border-zinc-700 text-zinc-400'
                        }`}
                      >
                        <span className="bg-gradient-to-r from-red-500 via-green-500 to-blue-500 w-4 h-4 rounded-full" />
                        In màu ($0.5/trang)
                      </button>
                      <button
                        onClick={() => setConfigColor('bw')}
                        className={`p-4 rounded-xl border font-bold text-sm transition-all flex flex-col items-center gap-1 ${
                          configColor === 'bw'
                            ? 'border-indigo-500 bg-indigo-500/5 text-white'
                            : 'border-zinc-800 hover:border-zinc-700 text-zinc-400'
                        }`}
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
                          onChange={(e) =>
                            setConfigCopies(Math.max(1, parseInt(e.target.value, 10) || 1))
                          }
                          className="w-full bg-zinc-950 border border-zinc-800 hover:border-zinc-700 focus:border-indigo-500 py-3 px-4 rounded-xl text-sm focus:outline-none transition-all text-white font-bold"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">
                          Khổ giấy
                        </label>
                        <select
                          value={configPaperSize}
                          onChange={(e) => setConfigPaperSize(e.target.value as 'a4' | 'a3' | 'a5')}
                          className="w-full bg-zinc-950 border border-zinc-800 hover:border-zinc-700 focus:border-indigo-500 py-3 px-4 rounded-xl text-sm focus:outline-none transition-all text-white font-bold"
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
                            onClick={() => setConfigBinding(b)}
                            className={`py-3 px-2 rounded-xl border text-xs font-bold transition-all capitalize ${
                              configBinding === b
                                ? 'border-indigo-500 bg-indigo-500/5 text-white'
                                : 'border-zinc-800 hover:border-zinc-700 text-zinc-400'
                            }`}
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
                        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-400" />
                        <select
                          value={printerLocation}
                          onChange={(e) => setPrinterLocation(e.target.value)}
                          className="w-full pl-10 pr-4 py-3 bg-zinc-950 border border-zinc-800 hover:border-zinc-700 focus:border-indigo-500 rounded-xl text-sm focus:outline-none transition-all text-white font-bold"
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
                </div>
              </div>

              {/* Right Column: Dynamic Preview Frame (5 cols) */}
              <div className="lg:col-span-5 space-y-6">
                <div className="glass-panel p-6 rounded-3xl border border-zinc-800 flex flex-col h-full min-h-[480px]">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-400 mb-4 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-indigo-400" /> Bản xem trước (Preview)
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

                  {/* Invoice summary & Print trigger */}
                  <div className="mt-6 pt-4 border-t border-zinc-900 space-y-4">
                    <div className="flex justify-between items-center text-sm font-semibold">
                      <span className="text-zinc-400">Ước tính giá lệnh in:</span>
                      <span className="text-xl font-bold text-white">
                        ${calculateCost().toFixed(2)}
                      </span>
                    </div>

                    <button
                      onClick={handlePrintSubmit}
                      disabled={!file || submitting || isUploading}
                      className="w-full py-4 bg-gradient-to-r from-indigo-500 to-violet-500 hover:from-indigo-600 hover:to-violet-600 disabled:opacity-50 disabled:pointer-events-none rounded-xl font-bold text-sm shadow-lg shadow-indigo-500/10 flex items-center justify-center gap-2 transition-transform hover:scale-[1.01] active:scale-[0.99]"
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
            </>
          )}
        </main>
      )}

      {/* Decorative glows */}
      <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-indigo-500/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-purple-500/5 rounded-full blur-[120px] pointer-events-none" />

      {/* Footer */}
      <footer className="border-t border-zinc-900 py-8 bg-zinc-950 text-center text-xs text-zinc-500 mt-20">
        &copy; 2026 PlatPrint. Tuyển dụng Kỹ sư Phần mềm - Vòng 2.
      </footer>
    </div>
  );
}
