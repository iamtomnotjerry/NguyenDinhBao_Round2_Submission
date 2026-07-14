import LoadingSkeleton from '@/components/LoadingSkeleton';

export default function Loading() {
  return (
    <div className="flex flex-col min-h-screen bg-surface text-fg">
      <main className="flex-1 w-full max-w-[1600px] mx-auto px-3 sm:px-5 lg:px-8 py-6 md:py-8">
        <LoadingSkeleton variant="page" />
      </main>
    </div>
  );
}
