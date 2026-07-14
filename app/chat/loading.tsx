import LoadingSkeleton from '@/components/LoadingSkeleton';

export default function Loading() {
  return (
    <div className="flex flex-col min-h-screen bg-surface text-fg">
      <main className="flex-1 flex flex-col max-w-4xl mx-auto w-full">
        <LoadingSkeleton variant="chat" />
      </main>
    </div>
  );
}
