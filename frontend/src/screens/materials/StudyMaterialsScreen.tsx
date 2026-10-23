import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Upload,
  FileText,
  Trash2,
  Eye,
  Bot,
  CheckSquare,
  AlertCircle,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import { materialsApi } from '@/api/materials';
import type { MaterialData } from '@/api/types';
import { Card, CardHeader, CardContent } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { Badge } from '@/components/common/Badge';
import { Modal } from '@/components/common/Modal';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { ErrorAlert } from '@/components/common/ErrorAlert';
import { EmptyState } from '@/components/common/EmptyState';
import { MaterialDetailModal } from './MaterialDetailModal';

export const StudyMaterialsScreen: React.FC = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [materials, setMaterials] = useState<MaterialData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Active Tab for Upload: 'pdf' | 'notes'
  const [uploadTab, setUploadTab] = useState<'pdf' | 'notes'>('pdf');

  // PDF Upload Form State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [pdfTitle, setPdfTitle] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgressMsg, setUploadProgressMsg] = useState<string | null>(null);
  const [uploadSuccessMsg, setUploadSuccessMsg] = useState<string | null>(null);

  // Paste Notes Form State
  const [notesTitle, setNotesTitle] = useState('');
  const [notesContent, setNotesContent] = useState('');
  const [isSavingNotes, setIsSavingNotes] = useState(false);

  // Material inspection & deletion modals
  const [inspectMaterialId, setInspectMaterialId] = useState<string | null>(null);
  const [materialToDelete, setMaterialToDelete] = useState<MaterialData | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadMaterials = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await materialsApi.list(50, 0);
      setMaterials(res.materials || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load study materials.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMaterials();
  }, [loadMaterials]);

  // Handle PDF file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (!file.name.toLowerCase().endsWith('.pdf')) {
        setError('Please select a valid PDF file (.pdf).');
        return;
      }
      setSelectedFile(file);
      if (!pdfTitle.trim()) {
        setPdfTitle(file.name.replace(/\.pdf$/i, ''));
      }
    }
  };

  // Submit PDF Upload
  const handlePdfUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      setError('Please choose a PDF file to upload.');
      return;
    }

    setIsUploading(true);
    setError(null);
    setUploadProgressMsg('Extracting text and indexing pages with PyMuPDF...');
    setUploadSuccessMsg(null);

    try {
      const uploaded = await materialsApi.uploadPdf(selectedFile, pdfTitle);
      setUploadSuccessMsg(`Successfully uploaded and indexed "${uploaded.title}" (${uploaded.page_count} pages).`);
      setSelectedFile(null);
      setPdfTitle('');
      if (fileInputRef.current) fileInputRef.current.value = '';
      await loadMaterials();
    } catch (err: any) {
      setError(err.message || 'Failed to upload and index PDF document.');
    } finally {
      setIsUploading(false);
      setUploadProgressMsg(null);
    }
  };

  // Submit Pasted Notes
  const handleNotesSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!notesTitle.trim() || !notesContent.trim()) {
      setError('Title and notes content are both required.');
      return;
    }

    setIsSavingNotes(true);
    setError(null);
    setUploadSuccessMsg(null);

    try {
      const created = await materialsApi.createNotes(notesTitle, notesContent);
      setUploadSuccessMsg(`Successfully saved and indexed notes for "${created.title}".`);
      setNotesTitle('');
      setNotesContent('');
      await loadMaterials();
    } catch (err: any) {
      setError(err.message || 'Failed to save notes.');
    } finally {
      setIsSavingNotes(false);
    }
  };

  // Confirm and execute material deletion
  const handleDeleteConfirm = async () => {
    if (!materialToDelete) return;
    setIsDeleting(true);
    try {
      await materialsApi.delete(materialToDelete.id);
      setMaterialToDelete(null);
      await loadMaterials();
    } catch (err: any) {
      setError(err.message || 'Failed to delete material.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {error && <ErrorAlert message={error} onRetry={loadMaterials} />}

      {uploadSuccessMsg && (
        <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 flex items-center justify-between text-xs text-emerald-800 dark:text-emerald-200 font-medium">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>{uploadSuccessMsg}</span>
          </div>
          <button
            onClick={() => setUploadSuccessMsg(null)}
            className="text-emerald-600 dark:text-emerald-400 hover:underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Upload & Add Materials Card */}
      <Card>
        <CardHeader
          title="Add Study Materials"
          subtitle="Upload textbook chapters (PDF, up to 20 pages) or paste notes for AI tutor grounding"
          action={
            <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-card)]">
              <button
                onClick={() => setUploadTab('pdf')}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors ${
                  uploadTab === 'pdf'
                    ? 'bg-[var(--bg-card)] text-[var(--accent-primary)] shadow-2xs'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                PDF Document
              </button>
              <button
                onClick={() => setUploadTab('notes')}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors ${
                  uploadTab === 'notes'
                    ? 'bg-[var(--bg-card)] text-[var(--accent-primary)] shadow-2xs'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                Pasted Notes
              </button>
            </div>
          }
        />
        <CardContent>
          {uploadTab === 'pdf' ? (
            <form onSubmit={handlePdfUpload} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1.5">
                    Document Title (Optional)
                  </label>
                  <input
                    type="text"
                    value={pdfTitle}
                    onChange={(e) => setPdfTitle(e.target.value)}
                    placeholder="e.g. Molecular Biology Chapter 4"
                    className="w-full px-3.5 py-2.5 rounded-xl text-sm bg-[var(--bg-secondary)] border border-[var(--border-card)] text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--accent-primary)] focus:ring-1 focus:ring-[var(--accent-primary)]"
                  />
                  <p className="text-[11px] text-[var(--text-secondary)] mt-1">
                    Defaults to filename if left empty. Max 20 pages / 10 MB per PDF.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1.5">
                    Select PDF File
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf,application/pdf"
                      onChange={handleFileChange}
                      className="hidden"
                      id="pdf-file-picker"
                    />
                    <label
                      htmlFor="pdf-file-picker"
                      className="flex-1 px-4 py-2.5 rounded-xl border border-dashed border-[var(--border-card)] hover:border-[var(--accent-primary)] bg-[var(--bg-secondary)]/50 hover:bg-[var(--bg-secondary)] flex items-center justify-center gap-2 cursor-pointer transition-colors text-xs text-[var(--text-secondary)]"
                    >
                      <Upload className="w-4 h-4 text-[var(--accent-primary)]" />
                      <span className="truncate">
                        {selectedFile ? selectedFile.name : 'Choose PDF file or drag & drop...'}
                      </span>
                    </label>
                  </div>
                </div>
              </div>

              {uploadProgressMsg && (
                <div className="p-3 rounded-xl bg-[var(--accent-subtle)] border border-[var(--accent-border)] flex items-center gap-2 text-xs text-[var(--accent-primary)] font-medium">
                  <LoadingSpinner size="sm" className="p-0" />
                  <span>{uploadProgressMsg}</span>
                </div>
              )}

              <div className="flex justify-end pt-2">
                <Button
                  type="submit"
                  disabled={!selectedFile || isUploading}
                  loading={isUploading}
                  icon={<Upload className="w-4 h-4" />}
                >
                  Index & Upload PDF
                </Button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleNotesSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1.5">
                  Notes Title *
                </label>
                <input
                  type="text"
                  required
                  value={notesTitle}
                  onChange={(e) => setNotesTitle(e.target.value)}
                  placeholder="e.g. Photosynthesis & Cellular Respiration Summary"
                  className="w-full px-3.5 py-2.5 rounded-xl text-sm bg-[var(--bg-secondary)] border border-[var(--border-card)] text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--accent-primary)]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1.5">
                  Study Content / Notes Text *
                </label>
                <textarea
                  required
                  rows={4}
                  value={notesContent}
                  onChange={(e) => setNotesContent(e.target.value)}
                  placeholder="Paste lecture excerpts, study guides, or concept definitions here..."
                  className="w-full px-3.5 py-2.5 rounded-xl text-sm bg-[var(--bg-secondary)] border border-[var(--border-card)] text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--accent-primary)] font-mono text-xs leading-relaxed"
                />
              </div>

              <div className="flex justify-end pt-2">
                <Button
                  type="submit"
                  disabled={!notesTitle.trim() || !notesContent.trim() || isSavingNotes}
                  loading={isSavingNotes}
                  icon={<Sparkles className="w-4 h-4" />}
                >
                  Save & Index Notes
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>

      {/* Materials Library Card */}
      <Card>
        <CardHeader
          title="Material Library"
          subtitle={`Total ${materials.length} indexed documents available for AI grounding`}
        />
        <CardContent>
          {loading ? (
            <LoadingSpinner label="Fetching your materials library..." size="md" className="py-12" />
          ) : materials.length === 0 ? (
            <EmptyState
              icon={<FileText className="w-6 h-6" />}
              title="Your library is empty"
              description="Upload your course PDF or paste notes above to start learning with AI."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[var(--border-card)] text-[var(--text-muted)] uppercase tracking-wider font-semibold">
                    <th className="pb-3 px-3">Title</th>
                    <th className="pb-3 px-3">Type</th>
                    <th className="pb-3 px-3">Pages</th>
                    <th className="pb-3 px-3">Size</th>
                    <th className="pb-3 px-3">Status</th>
                    <th className="pb-3 px-3">Added</th>
                    <th className="pb-3 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-subtle)]">
                  {materials.map((m) => (
                    <tr key={m.id} className="hover:bg-[var(--bg-card-hover)] transition-colors group">
                      <td className="py-3 px-3 font-semibold text-[var(--text-primary)]">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-[var(--accent-primary)] shrink-0" />
                          <span className="truncate max-w-xs">{m.title}</span>
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <Badge variant={m.material_type === 'pdf' ? 'accent' : 'neutral'} size="sm">
                          {m.material_type.toUpperCase()}
                        </Badge>
                      </td>
                      <td className="py-3 px-3 text-[var(--text-secondary)]">{m.page_count}</td>
                      <td className="py-3 px-3 text-[var(--text-secondary)] font-mono">
                        {m.char_count.toLocaleString()} chars
                      </td>
                      <td className="py-3 px-3">
                        <span className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium capitalize">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          {m.processing_status}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-[var(--text-muted)]">
                        {new Date(m.created_at).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            onClick={() => setInspectMaterialId(m.id)}
                            variant="ghost"
                            size="sm"
                            title="Inspect Chunks"
                            icon={<Eye className="w-3.5 h-3.5" />}
                          >
                            Chunks
                          </Button>
                          <Button
                            onClick={() => navigate('/tutor', { state: { materialId: m.id } })}
                            variant="outline"
                            size="sm"
                            title="Ask AI Tutor"
                            icon={<Bot className="w-3.5 h-3.5" />}
                          >
                            Tutor
                          </Button>
                          <Button
                            onClick={() => navigate('/quizzes', { state: { materialId: m.id, topic: m.title } })}
                            variant="ghost"
                            size="sm"
                            title="Practice Quiz"
                            icon={<CheckSquare className="w-3.5 h-3.5" />}
                          >
                            Quiz
                          </Button>
                          <button
                            onClick={() => setMaterialToDelete(m)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors ml-1"
                            title="Delete Material"
                            aria-label="Delete Material"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Inspect Material Chunks Modal */}
      <MaterialDetailModal
        materialId={inspectMaterialId}
        isOpen={!!inspectMaterialId}
        onClose={() => setInspectMaterialId(null)}
      />

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!materialToDelete}
        onClose={() => setMaterialToDelete(null)}
        title="Delete Study Material"
        maxWidth="sm"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40 text-rose-800 dark:text-rose-200 text-xs">
            <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
            <p>
              Are you sure you want to delete <strong>"{materialToDelete?.title}"</strong>?
              This will remove all indexed chunks. Associated quiz sessions will be preserved.
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setMaterialToDelete(null)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={handleDeleteConfirm}
              loading={isDeleting}
              icon={<Trash2 className="w-3.5 h-3.5" />}
            >
              Delete Permanently
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
