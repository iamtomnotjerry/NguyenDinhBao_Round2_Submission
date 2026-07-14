'use client';

import { useState, useRef, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { SafeDatabase } from '@/types/database.types';
import { User as SupabaseUser } from '@supabase/supabase-js';
import Header from '@/components/Header';
import { Printer, RefreshCw, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { calculatePrintCost } from '@/lib/utils';
import PrintPreview from './components/PrintPreview';
import PrintProgressView from './components/PrintProgressView';
import PrintConfigForm from './components/PrintConfigForm';

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
    <div className="flex flex-col min-h-screen bg-zinc-950 text-white font-sans selection:bg-emerald-500 selection:text-white">
      <Header />

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <RefreshCw className="w-8 h-8 animate-spin text-emerald-500" />
        </div>
      ) : (
        <main className="flex-1 max-w-6xl mx-auto px-6 py-12 w-full grid grid-cols-1 lg:grid-cols-12 gap-8 relative z-10">
          {!user ? (
            /* Unauthorized Banner */
            <div className="lg:col-span-12 glass-bezel-outer">
              <div className="glass-bezel-inner flex flex-col items-center justify-center p-16 text-center space-y-6">
                <div className="p-4 bg-emerald-500/10 rounded-full text-emerald-400 border border-emerald-500/20">
                  <Printer className="w-12 h-12" />
                </div>
                <h2 className="text-2xl font-bold">Vui lòng đăng nhập để bắt đầu in ấn</h2>
                <p className="text-zinc-400 max-w-md">
                  Để upload tài liệu PDF, cấu hình in, theo dõi tiến độ in realtime và tích lũy điểm
                  thưởng, bạn cần có tài khoản PlatPrint.
                </p>
                <Link
                  href="/auth"
                  className="px-8 py-4 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 rounded-xl font-bold transition-transform hover:scale-[1.02] active:scale-[0.98] flex items-center gap-2"
                >
                  Đăng nhập / Đăng ký ngay <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          ) : activeJob ? (
            <PrintProgressView
              activeJob={activeJob}
              printProgress={printProgress}
              onPrintNew={() => {
                setActiveJob(null);
                setFile(null);
                setFileName('');
              }}
            />
          ) : (
            <>
              <PrintConfigForm
                file={file}
                fileName={fileName}
                totalPages={totalPages}
                isUploading={isUploading}
                configColor={configColor}
                setConfigColor={setConfigColor}
                configCopies={configCopies}
                setConfigCopies={setConfigCopies}
                configPaperSize={configPaperSize}
                setConfigPaperSize={setConfigPaperSize}
                configBinding={configBinding}
                setConfigBinding={setConfigBinding}
                printerLocation={printerLocation}
                setPrinterLocation={setPrinterLocation}
                submitting={submitting}
                handleUploadClick={handleUploadClick}
                handlePrintSubmit={handlePrintSubmit}
                calculateCost={calculateCost}
                fileInputRef={fileInputRef}
                handleFileChange={handleFileChange}
              />
              <div className="lg:col-span-5 space-y-6">
                <PrintPreview
                  file={file}
                  fileUrl={fileUrl}
                  configColor={configColor}
                  configBinding={configBinding}
                  canvasRef={canvasRef}
                  previewImgRef={previewImgRef}
                />
              </div>
            </>
          )}
        </main>
      )}

      {/* Decorative glows */}
      <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-emerald-500/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-teal-500/5 rounded-full blur-[120px] pointer-events-none" />

      {/* Footer */}
      <footer className="border-t border-zinc-900 py-8 bg-zinc-950 text-center text-xs text-zinc-500 mt-20">
        &copy; 2026 PlatPrint. Tuyển dụng Kỹ sư Phần mềm - Vòng 2.
      </footer>
    </div>
  );
}
