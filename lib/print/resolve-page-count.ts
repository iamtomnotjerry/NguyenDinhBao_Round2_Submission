import { createAdminClient } from '@/lib/supabase/admin';

const MAX_PAGES = 2000;

/**
 * Prefer server-side PDF page count from Storage.
 * When PDF is readable, use pdf.numPages (never trust a lower client claim).
 * Non-PDF / unreadable: clamp client claim into [1, MAX_PAGES].
 */
export async function resolvePrintPageCount(args: {
  filePath: string;
  clientTotalPages: number;
}): Promise<{ pages: number; source: 'pdf' | 'client'; warning?: string }> {
  const claimed = Math.max(
    1,
    Math.min(MAX_PAGES, Math.floor(Number(args.clientTotalPages) || 0) || 1),
  );

  const admin = createAdminClient();
  if (!admin) {
    return {
      pages: claimed,
      source: 'client',
      warning: 'SERVICE_ROLE missing — using client total_pages',
    };
  }

  if (!args.filePath.toLowerCase().endsWith('.pdf')) {
    return { pages: claimed, source: 'client' };
  }

  try {
    const { data, error } = await admin.storage.from('print-files').download(args.filePath);
    if (error || !data) {
      return {
        pages: claimed,
        source: 'client',
        warning: `Could not verify PDF pages: ${error?.message || 'download failed'}`,
      };
    }

    const buffer = new Uint8Array(await data.arrayBuffer());
    const pdfjs = await import('pdfjs-dist');
    if (pdfjs.GlobalWorkerOptions) {
      pdfjs.GlobalWorkerOptions.workerSrc = '';
    }
    const doc = await pdfjs.getDocument({ data: buffer, disableWorker: true } as never).promise;
    const pdfPages = Math.max(1, Math.min(MAX_PAGES, doc.numPages || 1));

    return {
      pages: pdfPages,
      source: 'pdf',
      warning:
        claimed !== pdfPages
          ? `Client total_pages (${claimed}) overridden by PDF count (${pdfPages})`
          : undefined,
    };
  } catch (err) {
    return {
      pages: claimed,
      source: 'client',
      warning: `PDF page parse failed: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}
