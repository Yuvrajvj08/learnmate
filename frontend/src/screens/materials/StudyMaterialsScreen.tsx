import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
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
  Search,
  Filter,
  ArrowUpDown,
  MoreVertical,
  Edit2,
  BookOpen,
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

  // Search, Filter & Sort State
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'pdf' | 'text'>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'title'>('newest');

  // Active dropdown menu state
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  // Material inspection, rename & deletion modals
  const [inspectMaterialId, setInspectMaterialId] = useState<string | null>(null);
  const [materialToRename, setMaterialToRename] = useState<MaterialData | null>(null);
  const [renameTitleInput, setRenameTitleInput] = useState('');
  const [isRenaming, setIsRenaming] = useState(false);

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
    setUploadProgressMsg('Indexing pages and extracting text chunks...');
    setUploadSuccessMsg(null);

    try {
      const uploaded = await materialsApi.uploadPdf(selectedFile, pdfTitle);
      setUploadSuccessMsg(`Successfully uploaded "${uploaded.title}" (${uploaded.page_count} pages).`);
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
      setUploadSuccessMsg(`Successfully saved notes for "${created.title}".`);
      setNotesTitle('');
      setNotesContent('');
      await loadMaterials();
    } catch (err: any) {
      setError(err.message || 'Failed to save notes.');
    } finally {
      setIsSavingNotes(false);
    }
  };

  // Rename Flow
  const openRenameModal = (m: MaterialData) => {
    setMaterialToRename(m);
    setRenameTitleInput(m.title);
    setActiveMenuId(null);
  };

  const handleRenameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!materialToRename || !renameTitleInput.trim()) return;

    setIsRenaming(true);
    setError(null);
    try {
      await materialsApi.rename(materialToRename.id, renameTitleInput.trim());
      setUploadSuccessMsg(`Material renamed to "${renameTitleInput.trim()}".`);
      setMaterialToRename(null);
      await loadMaterials();
    } catch (err: any) {
      setError(err.message || 'Failed to rename study material.');
    } finally {
      setIsRenaming(false);
    }
  };

  // Delete Flow
  const handleDeleteConfirm = async () => {
    if (!materialToDelete) return;
    setIsDeleting(true);
    try {
      await materialsApi.delete(materialToDelete.id);
      setUploadSuccessMsg(`Deleted "${materialToDelete.title}".`);
      setMaterialToDelete(null);
      await loadMaterials();
    } catch (err: any) {
      setError(err.message || 'Failed to delete material.');
    } finally {
      setIsDeleting(false);
    }
  };

  // Client-side search, filtering and sorting
  const filteredMaterials = useMemo(() => {
    return materials
      .filter((m) => {
        const matchesQuery =
          !searchQuery.trim() ||
          m.title.toLowerCase().includes(searchQuery.toLowerCase().trim());
        const matchesType =
          typeFilter === 'all' || m.material_type.toLowerCase() === typeFilter;
        return matchesQuery && matchesType;
      })
      .sort((a, b) => {
        if (sortBy === 'newest') {
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        }
        if (sortBy === 'oldest') {
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        }
        return a.title.localeCompare(b.title);
      });
  }, [materials, searchQuery, typeFilter, sortBy]);

  return (
    <div className="space-y-6">
      {error && <ErrorAlert message={error} onRetry={loadMaterials} />}

      {uploadSuccessMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between text-xs text-emerald-800 font-medium">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{uploadSuccessMsg}</span>
          </div>
          <button
            onClick={() => setUploadSuccessMsg(null)}
            className="text-emerald-700 hover:underline font-semibold"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Compact Upload Card */}
      <Card>
        <CardHeader
          title="Add study material"
          subtitle="Upload textbook chapters (PDF, up to 20 pages) or paste notes for AI tutor grounding"
          action={
            <div className="flex items-center gap-1 p-0.5 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-card)]">
              <button
                type="button"
                onClick={() => setUploadTab('pdf')}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                  uploadTab === 'pdf'
                    ? 'bg-white text-[var(--accent-primary)] shadow-2xs'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                PDF document
              </button>
              <button
                type="button"
                onClick={() => setUploadTab('notes')}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                  uploadTab === 'notes'
                    ? 'bg-white text-[var(--accent-primary)] shadow-2xs'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                Pasted notes
              </button>
            </div>
          }
        />
        <CardContent className="pt-2">
          {uploadTab === 'pdf' ? (
            <form onSubmit={handlePdfUpload} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1">
                    Document title (optional)
                  </label>
                  <input
                    type="text"
                    value={pdfTitle}
                    onChange={(e) => setPdfTitle(e.target.value)}
                    placeholder="e.g. Molecular Biology Chapter 4"
                    className="w-full px-3 py-2 rounded-xl text-xs bg-[var(--bg-secondary)] border border-[var(--border-card)] text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--accent-primary)]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1">
                    PDF file
                  </label>
                  <div className="flex items-center gap-2">
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
                      className="flex-1 px-3 py-2 rounded-xl border border-dashed border-[var(--border-card)] hover:border-[var(--accent-primary)] bg-[var(--bg-secondary)]/50 flex items-center gap-2 cursor-pointer transition-colors text-xs text-[var(--text-secondary)] truncate"
                    >
                      <Upload className="w-3.5 h-3.5 text-[var(--accent-primary)] shrink-0" />
                      <span className="truncate">
                        {selectedFile ? selectedFile.name : 'Select a PDF file (max 20 pages, 10 MB)'}
                      </span>
                    </label>
                    <Button
                      type="submit"
                      disabled={!selectedFile || isUploading}
                      loading={isUploading}
                      size="sm"
                      icon={<Upload className="w-3.5 h-3.5" />}
                    >
                      Upload
                    </Button>
                  </div>
                </div>
              </div>

              {uploadProgressMsg && (
                <div className="p-2.5 rounded-lg bg-[var(--accent-subtle)] border border-[var(--accent-border)] flex items-center gap-2 text-xs text-[var(--accent-primary)] font-medium">
                  <LoadingSpinner size="sm" className="p-0" />
                  <span>{uploadProgressMsg}</span>
                </div>
              )}
            </form>
          ) : (
            <form onSubmit={handleNotesSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1">
                  Notes title *
                </label>
                <input
                  type="text"
                  required
                  value={notesTitle}
                  onChange={(e) => setNotesTitle(e.target.value)}
                  placeholder="e.g. Photosynthesis Summary"
                  className="w-full px-3 py-2 rounded-xl text-xs bg-[var(--bg-secondary)] border border-[var(--border-card)] text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--accent-primary)]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1">
                  Notes content *
                </label>
                <textarea
                  required
                  rows={3}
                  value={notesContent}
                  onChange={(e) => setNotesContent(e.target.value)}
                  placeholder="Paste lecture excerpts, study notes, or concept definitions..."
                  className="w-full px-3 py-2 rounded-xl text-xs bg-[var(--bg-secondary)] border border-[var(--border-card)] text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--accent-primary)] font-mono leading-relaxed"
                />
              </div>

              <div className="flex justify-end">
                <Button
                  type="submit"
                  size="sm"
                  disabled={!notesTitle.trim() || !notesContent.trim() || isSavingNotes}
                  loading={isSavingNotes}
                  icon={<Sparkles className="w-3.5 h-3.5" />}
                >
                  Save notes
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>

      {/* Materials Library Card */}
      <Card>
        <CardHeader
          title="Material library"
          subtitle={`${filteredMaterials.length} of ${materials.length} study documents shown`}
        />
        <CardContent className="space-y-4">
          {/* Search, Filter & Sort Controls */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pb-2 border-b border-[var(--border-subtle)]">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-4 h-4 text-[var(--text-muted)] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by title..."
                className="w-full pl-9 pr-3 py-1.5 rounded-lg text-xs bg-[var(--bg-secondary)] border border-[var(--border-card)] text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--accent-primary)]"
              />
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Type filter */}
              <div className="flex items-center gap-1 text-xs">
                <Filter className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value as any)}
                  className="px-2 py-1 rounded-lg text-xs bg-[var(--bg-secondary)] border border-[var(--border-card)] text-[var(--text-secondary)] focus:outline-hidden focus:border-[var(--accent-primary)]"
                >
                  <option value="all">All types</option>
                  <option value="pdf">PDF only</option>
                  <option value="text">Notes only</option>
                </select>
              </div>

              {/* Sort by */}
              <div className="flex items-center gap-1 text-xs">
                <ArrowUpDown className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="px-2 py-1 rounded-lg text-xs bg-[var(--bg-secondary)] border border-[var(--border-card)] text-[var(--text-secondary)] focus:outline-hidden focus:border-[var(--accent-primary)]"
                >
                  <option value="newest">Newest first</option>
                  <option value="oldest">Oldest first</option>
                  <option value="title">Title (A-Z)</option>
                </select>
              </div>
            </div>
          </div>

          {loading ? (
            <LoadingSpinner label="Loading materials library..." size="md" className="py-12" />
          ) : filteredMaterials.length === 0 ? (
            <EmptyState
              icon={<FileText className="w-6 h-6" />}
              title={materials.length === 0 ? "Your library is empty" : "No matching documents"}
              description={
                materials.length === 0
                  ? "Upload your course PDF or paste notes above to start learning with AI."
                  : "Try clearing your search query or changing the filter options."
              }
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[var(--border-card)] text-[var(--text-muted)] font-semibold">
                    <th className="pb-2.5 px-3">Title</th>
                    <th className="pb-2.5 px-3">Type</th>
                    <th className="pb-2.5 px-3">Pages</th>
                    <th className="pb-2.5 px-3">Size</th>
                    <th className="pb-2.5 px-3">Added</th>
                    <th className="pb-2.5 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-subtle)]">
                  {filteredMaterials.map((m) => (
                    <tr key={m.id} className="hover:bg-[var(--bg-card-hover)] transition-colors group">
                      <td className="py-2.5 px-3 font-semibold text-[var(--text-primary)]">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-[var(--accent-primary)] shrink-0" />
                          <span className="truncate max-w-xs">{m.title}</span>
                        </div>
                      </td>
                      <td className="py-2.5 px-3">
                        <Badge variant={m.material_type === 'pdf' ? 'accent' : 'neutral'} size="sm">
                          {m.material_type.toUpperCase()}
                        </Badge>
                      </td>
                      <td className="py-2.5 px-3 text-[var(--text-secondary)]">{m.page_count}</td>
                      <td className="py-2.5 px-3 text-[var(--text-secondary)] font-mono">
                        {m.char_count.toLocaleString()} chars
                      </td>
                      <td className="py-2.5 px-3 text-[var(--text-muted)]">
                        {new Date(m.created_at).toLocaleDateString()}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <div className="flex items-center justify-end gap-2 relative">
                          {/* Primary Action: Study */}
                          <Button
                            onClick={() => navigate('/tutor', { state: { materialId: m.id } })}
                            variant="primary"
                            size="sm"
                            icon={<BookOpen className="w-3.5 h-3.5" />}
                          >
                            Study
                          </Button>

                          {/* Overflow Menu */}
                          <div className="relative">
                            <button
                              type="button"
                              onClick={() => setActiveMenuId(activeMenuId === m.id ? null : m.id)}
                              className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] border border-transparent hover:border-[var(--border-card)] transition-colors"
                              title="More options"
                              aria-label="More options"
                            >
                              <MoreVertical className="w-4 h-4" />
                            </button>

                            {activeMenuId === m.id && (
                              <div
                                className="absolute right-0 mt-1 w-40 p-1.5 rounded-xl bg-white border border-[var(--border-card)] shadow-lg z-30 space-y-0.5 text-left"
                                onMouseLeave={() => setActiveMenuId(null)}
                              >
                                <button
                                  type="button"
                                  onClick={() => {
                                    setInspectMaterialId(m.id);
                                    setActiveMenuId(null);
                                  }}
                                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]"
                                >
                                  <Eye className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
                                  <span>View chunks</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => {
                                    navigate('/quizzes', { state: { materialId: m.id, topic: m.title } });
                                    setActiveMenuId(null);
                                  }}
                                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]"
                                >
                                  <CheckSquare className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
                                  <span>Create quiz</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => openRenameModal(m)}
                                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]"
                                >
                                  <Edit2 className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
                                  <span>Rename</span>
                                </button>

                                <div className="border-t border-[var(--border-subtle)] my-1" />

                                <button
                                  type="button"
                                  onClick={() => {
                                    setMaterialToDelete(m);
                                    setActiveMenuId(null);
                                  }}
                                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs text-rose-600 hover:bg-rose-50"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  <span>Delete</span>
                                </button>
                              </div>
                            )}
                          </div>
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

      {/* Rename Material Modal */}
      <Modal
        isOpen={!!materialToRename}
        onClose={() => setMaterialToRename(null)}
        title="Rename study material"
        maxWidth="sm"
      >
        <form onSubmit={handleRenameSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1">
              Material title *
            </label>
            <input
              type="text"
              required
              value={renameTitleInput}
              onChange={(e) => setRenameTitleInput(e.target.value)}
              className="w-full px-3 py-2 rounded-xl text-xs bg-[var(--bg-secondary)] border border-[var(--border-card)] text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--accent-primary)]"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setMaterialToRename(null)}
              disabled={isRenaming}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              loading={isRenaming}
              disabled={!renameTitleInput.trim()}
            >
              Save title
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!materialToDelete}
        onClose={() => setMaterialToDelete(null)}
        title="Delete study material"
        maxWidth="sm"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <p>
              Are you sure you want to delete <strong>"{materialToDelete?.title}"</strong>?
              This will remove all indexed chunks. Associated quiz sessions will remain in your progress.
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
              Delete permanently
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default StudyMaterialsScreen;
