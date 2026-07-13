import Link from 'next/link';
import { Printer, ShoppingBag, MessageSquare, ShieldCheck, Zap } from 'lucide-react';

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen bg-zinc-950 text-white font-sans selection:bg-indigo-500 selection:text-white">
      {/* Header */}
      <header className="border-b border-zinc-800 bg-zinc-950/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-tr from-indigo-500 to-violet-500 rounded-xl shadow-lg shadow-indigo-500/20">
              <Printer className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-white via-zinc-200 to-zinc-400 bg-clip-text text-transparent">
              PlatPrint
            </span>
          </div>
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-zinc-400">
            <Link href="/print" className="hover:text-white transition-colors">
              In ấn từ xa
            </Link>
            <Link href="/store" className="hover:text-white transition-colors">
              Gian hàng
            </Link>
            <Link href="/chat" className="hover:text-white transition-colors">
              Hỗ trợ AI
            </Link>
          </nav>
          <div>
            <Link
              href="/auth"
              className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-sm font-semibold rounded-lg transition-colors border border-zinc-700"
            >
              Đăng nhập
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 max-w-6xl mx-auto px-6 py-20 flex flex-col justify-center">
        <div className="text-center max-w-3xl mx-auto space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-500/10 border border-indigo-500/20 rounded-full text-indigo-400 text-xs font-semibold uppercase tracking-wider">
            <Zap className="w-3.5 h-3.5" /> Giải pháp in ấn từ xa tích hợp AI
          </div>
          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight leading-tight">
            Nền tảng in ấn vật lý <br />
            <span className="bg-gradient-to-r from-indigo-400 via-violet-400 to-purple-400 bg-clip-text text-transparent">
              từ bất kỳ nơi đâu
            </span>
          </h1>
          <p className="text-zinc-400 text-lg sm:text-xl leading-relaxed">
            PlatPrint kết nối bạn với các địa điểm in ấn đối tác thời gian thực. Gửi lệnh in, cấu
            hình thông minh, thanh toán một chạm bảo mật và nhận tài liệu dễ dàng.
          </p>
          <div className="flex flex-col sm:flex-row justify-center items-center gap-4 pt-6">
            <Link
              href="/print"
              className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-indigo-500 to-violet-500 hover:from-indigo-600 hover:to-violet-600 rounded-xl font-bold shadow-lg shadow-indigo-500/20 transition-all hover:scale-[1.02] flex items-center justify-center gap-2"
            >
              <Printer className="w-5 h-5" /> Bắt đầu in ấn
            </Link>
            <Link
              href="/store"
              className="w-full sm:w-auto px-8 py-4 bg-zinc-900 hover:bg-zinc-800 rounded-xl font-bold transition-all border border-zinc-800 hover:border-zinc-700 flex items-center justify-center gap-2"
            >
              <ShoppingBag className="w-5 h-5" /> Mua ấn phẩm in sẵn
            </Link>
          </div>
        </div>

        {/* Features Grid */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-32">
          {/* Card 1 */}
          <div className="glass-panel-interactive rounded-2xl p-8 space-y-4">
            <div className="p-3 bg-indigo-500/10 rounded-xl w-fit text-indigo-400">
              <Printer className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold">In Ấn Thời Gian Thực</h3>
            <p className="text-zinc-400 text-sm leading-relaxed">
              Upload file PDF/ảnh, theo dõi tiến độ in trang-theo-trang thông qua bộ mô phỏng máy in
              kết nối realtime.
            </p>
          </div>

          {/* Card 2 */}
          <div className="glass-panel-interactive rounded-2xl p-8 space-y-4">
            <div className="p-3 bg-violet-500/10 rounded-xl w-fit text-violet-400">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold">Thanh Toán Một Chạm</h3>
            <p className="text-zinc-400 text-sm leading-relaxed">
              Tích hợp Sandbox Payment bảo mật cao (PCI-DSS), lưu trữ thông tin thẻ an toàn dưới
              dạng token để thanh toán nhanh.
            </p>
          </div>

          {/* Card 3 */}
          <div className="glass-panel-interactive rounded-2xl p-8 space-y-4">
            <div className="p-3 bg-purple-500/10 rounded-xl w-fit text-purple-400">
              <MessageSquare className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold">Trợ Lý AI Đa Ngôn Ngữ</h3>
            <p className="text-zinc-400 text-sm leading-relaxed">
              Hỗ trợ khách hàng toàn cầu thông qua trợ lý ảo AI (Gemini SDK) với tính năng phát hiện
              ngôn ngữ và streaming.
            </p>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-900 py-8 bg-zinc-950">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-zinc-500">
          <span>&copy; 2026 PlatPrint. Tuyển dụng Kỹ sư Phần mềm - Vòng 2.</span>
          <div className="flex gap-6">
            <a href="#" className="hover:text-zinc-300">
              Nội quy
            </a>
            <a href="#" className="hover:text-zinc-300">
              Bảo mật
            </a>
            <a href="#" className="hover:text-zinc-300">
              Liên hệ
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
