import Link from 'next/link';
import {
  Printer,
  ShoppingBag,
  MessageSquare,
  ShieldCheck,
  Zap,
  ArrowRight,
  CheckCircle,
} from 'lucide-react';
import Header from '@/components/Header';

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen bg-zinc-950 text-white font-sans selection:bg-indigo-500 selection:text-white relative overflow-hidden">
      <Header />

      {/* Decorative ambient background glows */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-indigo-500/5 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute top-[20%] right-[10%] w-[400px] h-[400px] bg-violet-500/5 rounded-full blur-[140px] pointer-events-none" />

      {/* Hero Section: Asymmetric 2-column layout */}
      <main className="flex-1 max-w-6xl mx-auto px-6 py-12 md:py-24 w-full space-y-24 relative z-10">
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Left Column: Headline and Copy (7 columns) */}
          <div className="lg:col-span-7 space-y-6 text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-500/10 border border-indigo-500/20 rounded-full text-indigo-400 text-xs font-medium tracking-wide">
              <Zap className="w-3.5 h-3.5 text-indigo-400" /> Giải pháp in ấn từ xa tích hợp trợ lý
              AI
            </div>

            <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight leading-[1.05] text-white">
              Nền tảng in ấn vật lý <br />
              <span className="bg-gradient-to-r from-indigo-400 via-violet-400 to-purple-400 bg-clip-text text-transparent">
                từ bất kỳ nơi đâu.
              </span>
            </h1>

            <p className="text-zinc-400 text-base sm:text-lg leading-relaxed max-w-[55ch]">
              PlatPrint kết nối bạn với mạng lưới máy in đối tác tức thời. Tải lên tài liệu, cấu
              hình khổ giấy màu sắc linh hoạt, thanh toán token bảo mật và nhận bản in nhanh chóng.
            </p>

            <div className="flex flex-col sm:flex-row items-center gap-4 pt-4">
              <Link
                href="/print"
                className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-indigo-500 to-violet-500 hover:from-indigo-600 hover:to-violet-600 rounded-xl font-bold shadow-lg shadow-indigo-500/10 transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2 group text-sm"
              >
                <Printer className="w-4.5 h-4.5" /> Bắt đầu in ấn ngay{' '}
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link
                href="/store"
                className="w-full sm:w-auto px-8 py-4 bg-zinc-900/80 hover:bg-zinc-800 rounded-xl font-bold transition-all border border-zinc-850 hover:border-zinc-700 active:scale-[0.98] flex items-center justify-center gap-2 text-sm"
              >
                <ShoppingBag className="w-4.5 h-4.5 text-indigo-400" /> Xem gian hàng ấn phẩm
              </Link>
            </div>
          </div>

          {/* Right Column: Premium Visual Mockup (5 columns) */}
          <div className="lg:col-span-5 relative">
            <div className="glass-panel p-6 rounded-3xl border border-zinc-850/80 shadow-2xl relative overflow-hidden group">
              {/* Mock PDF Document Preview Card */}
              <div className="relative bg-white text-zinc-950 rounded-xl p-8 aspect-[3/4] shadow-inner flex flex-col justify-between overflow-hidden">
                {/* Spiral binder illustration */}
                <div className="absolute left-0 top-0 bottom-0 w-3 flex flex-col justify-around py-3 bg-gradient-to-r from-zinc-300 to-transparent border-r border-dashed border-zinc-300/40">
                  {Array.from({ length: 10 }).map((_, idx) => (
                    <div
                      key={idx}
                      className="w-3 h-1 bg-gradient-to-r from-zinc-400 to-zinc-600 rounded-full -ml-1.5 shadow-sm"
                    />
                  ))}
                </div>

                <div className="pl-4 space-y-4">
                  <div className="flex justify-between items-start">
                    <span className="text-[10px] uppercase tracking-wider font-extrabold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                      Document Spec
                    </span>
                    <span className="text-[10px] text-zinc-400 font-mono">Page 1 of 12</span>
                  </div>
                  <div className="space-y-2">
                    <h4 className="text-lg font-black leading-tight text-zinc-900">
                      Bản Thiết Kế PlatPrint
                    </h4>
                    <p className="text-xs text-zinc-500 leading-relaxed">
                      Tài liệu hướng dẫn sử dụng hệ thống in ấn từ xa thông minh. Tích hợp thanh
                      toán an toàn và kết nối mạng lưới đối tác rộng khắp.
                    </p>
                  </div>
                </div>

                <div className="pl-4 flex items-center justify-between border-t border-zinc-100 pt-4 mt-8">
                  <div className="flex gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
                    <span className="w-2.5 h-2.5 rounded-full bg-green-500" />
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                  </div>
                  <span className="text-xs font-bold text-zinc-400">PlatPrint Engine v2.1</span>
                </div>
              </div>

              {/* Float badge */}
              <div className="absolute bottom-4 right-4 bg-zinc-950/95 border border-zinc-800 rounded-2xl p-3 shadow-xl flex items-center gap-2.5 animate-pulse-slow">
                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="text-xs font-bold text-zinc-300">Máy in Quận 1 online</span>
              </div>
            </div>
          </div>
        </section>

        {/* Features Bento Grid Section */}
        <section className="space-y-8">
          <div className="space-y-2 text-center lg:text-left">
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Tính năng hệ thống tối ưu
            </h2>
            <p className="text-zinc-500 text-sm max-w-md">
              Kiến trúc bảo mật, tích hợp AI thông minh và thiết kế bento tối giản.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            {/* Bento Cell 1: Large Feature Simulator (Spans 8 cols) */}
            <div className="md:col-span-8 glass-panel-interactive rounded-3xl p-8 flex flex-col justify-between group min-h-[320px]">
              <div className="space-y-3">
                <div className="p-3 bg-indigo-500/10 rounded-xl w-fit text-indigo-400 border border-indigo-500/10">
                  <Printer className="w-5 h-5" />
                </div>
                <h3 className="text-xl font-bold">Mô phỏng in ấn thời gian thực</h3>
                <p className="text-zinc-400 text-sm leading-relaxed max-w-lg">
                  Theo dõi trạng thái in ấn thực tế của từng tài liệu thông qua cơ chế đồng bộ dữ
                  liệu Realtime của Supabase. Trải nghiệm in ấn từ xa chân thực từng trang.
                </p>
              </div>

              {/* Micro-preview component inside bento block */}
              <div className="mt-6 p-4 bg-zinc-950/60 border border-zinc-900 rounded-2xl space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-zinc-400 font-bold truncate max-w-[200px]">
                    tai-lieu-ky-thuat.pdf
                  </span>
                  <span className="text-indigo-400 font-mono text-[10px] uppercase font-bold">
                    Printing...
                  </span>
                </div>
                <div className="w-full bg-zinc-900 h-2 rounded-full overflow-hidden">
                  <div className="bg-indigo-500 h-full w-[70%] rounded-full animate-pulse-slow" />
                </div>
              </div>
            </div>

            {/* Bento Cell 2: Payment Token Card (Spans 4 cols) */}
            <div className="md:col-span-4 glass-panel-interactive rounded-3xl p-8 flex flex-col justify-between group min-h-[320px]">
              <div className="space-y-3">
                <div className="p-3 bg-violet-500/10 rounded-xl w-fit text-violet-400 border border-violet-500/10">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <h3 className="text-xl font-bold">Bảo mật PCI-DSS</h3>
                <p className="text-zinc-400 text-sm leading-relaxed">
                  Lưu trữ thẻ an toàn thông qua cơ chế token hóa sandbox. Tuyệt đối không lưu giữ số
                  thẻ gốc trên máy chủ.
                </p>
              </div>

              <div className="mt-6 flex items-center justify-between p-3 bg-zinc-950/60 border border-zinc-900 rounded-xl">
                <div className="flex items-center gap-2">
                  <span className="w-7 h-4.5 bg-zinc-800 rounded border border-zinc-700 flex items-center justify-center text-[8px] font-bold text-zinc-500">
                    Visa
                  </span>
                  <span className="text-xs font-mono text-zinc-400">•••• 4001</span>
                </div>
                <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" /> Tokenized
                </span>
              </div>
            </div>

            {/* Bento Cell 3: Full Width AI Assistant Feature (Spans 12 cols) */}
            <div className="md:col-span-12 glass-panel-interactive rounded-3xl p-8 flex flex-col md:flex-row justify-between items-center gap-8 min-h-[220px]">
              <div className="space-y-3 max-w-xl">
                <div className="p-3 bg-purple-500/10 rounded-xl w-fit text-purple-400 border border-purple-500/10">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <h3 className="text-xl font-bold">Trợ lý hỗ trợ AI đa ngôn ngữ</h3>
                <p className="text-zinc-400 text-sm leading-relaxed">
                  Trò chuyện tức thời với mô hình ngôn ngữ lớn để được hướng dẫn in ấn, tính toán
                  giá tiền, giải đáp lỗi thẻ thanh toán, và tự động chuyển tiếp hỗ trợ viên khi cần
                  thiết.
                </p>
              </div>
              <Link
                href="/chat"
                className="w-full md:w-auto px-6 py-3 bg-zinc-900 border border-zinc-800 hover:border-zinc-750 hover:bg-zinc-850 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2 whitespace-nowrap"
              >
                Trải nghiệm Chat ngay <ArrowRight className="w-3.5 h-3.5 text-indigo-400" />
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-900 py-8 bg-zinc-950 relative z-10 mt-16">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-zinc-500">
          <span>&copy; 2026 PlatPrint. Tuyển dụng Kỹ sư Phần mềm - Vòng 2.</span>
          <div className="flex gap-6 font-semibold">
            <a href="#" className="hover:text-zinc-300 transition-colors">
              Nội quy
            </a>
            <a href="#" className="hover:text-zinc-300 transition-colors">
              Bảo mật
            </a>
            <a href="#" className="hover:text-zinc-300 transition-colors">
              Liên hệ
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
