import React, { useEffect, useState } from 'react';
import { FileText, Layers, Hash } from 'lucide-react';
import { materialsApi } from '@/api/materials';
import type { MaterialContentData, MaterialDetailData } from '@/api/types';
import { Modal } from '@/components/common/Modal';
import { Badge } from '@/components/common/Badge';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { ErrorAlert } from '@/components/common/ErrorAlert';

interface MaterialDetailModalProps {
  materialId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

export const MaterialDetailModal: React.FC<MaterialDetailModalProps> = ({
  materialId,
  isOpen,
  onClose,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detail, setDetail] = useState<MaterialDetailData | null>(null);
  const [content, setContent] = useState<MaterialContentData | null>(null);

  useEffect(() => {
    if (!materialId || !isOpen) return;

    let isMounted = true;
    const fetchMaterialDetails = async () => {
      setLoading(true);
      setError(null);
      try {
        const [detRes, contRes] = await Promise.all([
          materialsApi.getById(materialId),
          materialsApi.getContent(materialId),
        ]);
        if (isMounted) {
          setDetail(detRes);
          setContent(contRes);
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err.message || 'Failed to load material content.');
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchMaterialDetails();
    return () => {
      isMounted = false;
    };
  }, [materialId, isOpen]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={detail?.title || 'Material Content & Chunks'}
      subtitle={
        detail
          ? `${detail.material_type.toUpperCase()} • ${detail.page_count} pages • ${detail.char_count.toLocaleString()} characters`
          : undefined
      }
      maxWidth="2xl"
    >
      {loading && <LoadingSpinner label="Retrieving indexed chunks..." size="md" />}
      {error && <ErrorAlert message={error} />}

      {!loading && content && (
        <div className="space-y-6">
          {/* Metadata Bar */}
          <div className="flex flex-wrap items-center gap-2 p-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-card)] text-xs">
            <span className="font-semibold text-[var(--text-primary)]">Indexed Chunks:</span>
            <Badge variant="accent" size="sm">
              {content.chunks.length} total
            </Badge>
            <span className="text-[var(--text-secondary)]">•</span>
            <span className="text-[var(--text-secondary)]">
              Status: <span className="font-semibold text-emerald-600 capitalize">{detail?.processing_status}</span>
            </span>
          </div>

          {/* Chunks List */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
              Extracted Chunks with Source References
            </h4>

            {content.chunks.length === 0 ? (
              <p className="text-sm text-[var(--text-secondary)] py-4 text-center">
                No chunks found in this document.
              </p>
            ) : (
              content.chunks.map((chunk) => (
                <div
                  key={chunk.id}
                  className="p-4 rounded-xl bg-[var(--bg-card)] border border-[var(--border-card)] space-y-2 text-xs"
                >
                  <div className="flex items-center justify-between text-[11px] text-[var(--text-muted)]">
                    <div className="flex items-center gap-2 font-medium">
                      <span className="px-1.5 py-0.5 rounded bg-[var(--accent-subtle)] text-[var(--accent-primary)] font-bold">
                        Chunk #{chunk.chunk_position + 1}
                      </span>
                      {chunk.page_number && (
                        <span className="flex items-center gap-1 text-[var(--text-secondary)]">
                          <FileText className="w-3 h-3" /> Page {chunk.page_number}
                        </span>
                      )}
                      {chunk.section_reference && (
                        <span className="flex items-center gap-1 text-[var(--text-secondary)]">
                          <Layers className="w-3 h-3" /> {chunk.section_reference}
                        </span>
                      )}
                    </div>
                    <span className="flex items-center gap-1 text-[var(--text-muted)]">
                      <Hash className="w-3 h-3" /> {chunk.char_length} chars
                    </span>
                  </div>

                  <p className="text-xs text-[var(--text-primary)] leading-relaxed font-mono whitespace-pre-wrap bg-[var(--bg-secondary)]/50 p-2.5 rounded-lg border border-[var(--border-subtle)]">
                    {chunk.content}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </Modal>
  );
};
