import React, { useState } from 'react';
import {
  FolderOpen,
  Search,
  Star,
  Clock,
  Trash2,
  File,
  FileCode,
  FileText,
  Download,
  Edit2,
  Info,
  X,
  Plus,
  ArrowUpDown,
  Filter,
} from 'lucide-react';
import { ProjectFile } from '../../types';

interface FilesCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const INITIAL_WORKSPACE_FILES: ProjectFile[] = [
  {
    id: 'f_arch_doc',
    name: 'Radhe_Krishna_AI_Architecture.md',
    path: '/docs/Radhe_Krishna_AI_Architecture.md',
    language: 'markdown',
    updatedAt: Date.now() - 3600000 * 2,
    size: 4096,
    isFavorite: true,
    content: `# Radhe Krishna AI System Blueprint
Personal AI Agent built for Suraj Rajput.
Integrations: Google Workspace (Gmail, Calendar, Drive, Docs, Sheets, Tasks, Contacts).
AI Brain: Gemini 3.5 Flash & Gemini 3.1 Pro with High Thinking.`,
  },
  {
    id: 'f_user_pref',
    name: 'Suraj_Rajput_Workflow_Guidelines.json',
    path: '/config/Suraj_Rajput_Workflow_Guidelines.json',
    language: 'json',
    updatedAt: Date.now() - 3600000 * 8,
    size: 1024,
    isFavorite: true,
    content: `{\n  "user": "Suraj Rajput",\n  "languages": ["English", "Hindi", "Hinglish"],\n  "standards": "Zero fake data, real verification required."\n}`,
  },
  {
    id: 'f_automation_log',
    name: 'Morning_Briefing_Report.txt',
    path: '/reports/Morning_Briefing_Report.txt',
    language: 'text',
    updatedAt: Date.now() - 3600000 * 14,
    size: 2048,
    isFavorite: false,
    content: `Verified report generated for Suraj Rajput.\nGmail Inbox: Scanned.\nCalendar Schedule: Checked.`,
  },
];

export const FilesCenterModal: React.FC<FilesCenterModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [files, setFiles] = useState<ProjectFile[]>(INITIAL_WORKSPACE_FILES);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFolder, setSelectedFolder] = useState<'all' | 'recent' | 'favorites' | 'trash'>('all');
  const [selectedFileForDetails, setSelectedFileForDetails] = useState<ProjectFile | null>(null);
  const [editingFileId, setEditingFileId] = useState<string | null>(null);
  const [editFileName, setEditFileName] = useState('');

  if (!isOpen) return null;

  const filteredFiles = files.filter((f) => {
    if (selectedFolder === 'favorites' && !f.isFavorite) return false;
    if (selectedFolder === 'trash' && !f.isTrash) return false;
    if (selectedFolder !== 'trash' && f.isTrash) return false;

    if (!searchQuery.trim()) return true;
    return (
      f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.path.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  const handleToggleFavorite = (id: string) => {
    setFiles((prev) =>
      prev.map((f) => (f.id === id ? { ...f, isFavorite: !f.isFavorite } : f))
    );
  };

  const handleDeleteFile = (id: string) => {
    setFiles((prev) =>
      prev.map((f) => (f.id === id ? { ...f, isTrash: true } : f))
    );
    if (selectedFileForDetails?.id === id) setSelectedFileForDetails(null);
  };

  const handleStartRename = (f: ProjectFile) => {
    setEditingFileId(f.id);
    setEditFileName(f.name);
  };

  const handleSaveRename = (id: string) => {
    if (!editFileName.trim()) return;
    setFiles((prev) =>
      prev.map((f) => (f.id === id ? { ...f, name: editFileName.trim() } : f))
    );
    setEditingFileId(null);
  };

  const handleDownload = (f: ProjectFile) => {
    const blob = new Blob([f.content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = f.name;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-blue-500/20 text-blue-300 border border-blue-500/30">
              <FolderOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                Files Center
                <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-300 border border-blue-500/20 font-mono">
                  {files.filter((f) => !f.isTrash).length} Files
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Workspace file explorer, documentation & storage for Suraj Rajput.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Layout */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          {/* Sidebar Navigation */}
          <div className="w-full md:w-56 p-4 border-b md:border-b-0 md:border-r border-slate-800 bg-slate-950/50 space-y-1">
            <button
              onClick={() => setSelectedFolder('all')}
              className={`w-full px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-colors ${
                selectedFolder === 'all'
                  ? 'bg-blue-600/20 text-blue-300 border border-blue-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <FolderOpen className="w-4 h-4 text-blue-400" />
              <span>All Workspace Files</span>
            </button>

            <button
              onClick={() => setSelectedFolder('recent')}
              className={`w-full px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-colors ${
                selectedFolder === 'recent'
                  ? 'bg-blue-600/20 text-blue-300 border border-blue-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <Clock className="w-4 h-4 text-purple-400" />
              <span>Recent Documents</span>
            </button>

            <button
              onClick={() => setSelectedFolder('favorites')}
              className={`w-full px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-colors ${
                selectedFolder === 'favorites'
                  ? 'bg-blue-600/20 text-blue-300 border border-blue-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <Star className="w-4 h-4 text-amber-400" />
              <span>Favorites</span>
            </button>

            <button
              onClick={() => setSelectedFolder('trash')}
              className={`w-full px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-colors ${
                selectedFolder === 'trash'
                  ? 'bg-rose-600/20 text-rose-300 border border-rose-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <Trash2 className="w-4 h-4 text-rose-400" />
              <span>Trash</span>
            </button>
          </div>

          {/* Files List */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Search Bar */}
            <div className="p-3 border-b border-slate-800 bg-slate-900/40">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search files by name or path..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {filteredFiles.map((file) => (
                <div
                  key={file.id}
                  className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 hover:border-blue-500/30 transition-all flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <FileText className="w-5 h-5 text-blue-400 shrink-0" />
                    <div className="min-w-0">
                      {editingFileId === file.id ? (
                        <div className="flex items-center gap-1.5">
                          <input
                            type="text"
                            value={editFileName}
                            onChange={(e) => setEditFileName(e.target.value)}
                            className="px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-xs text-slate-100"
                          />
                          <button
                            onClick={() => handleSaveRename(file.id)}
                            className="px-2 py-0.5 rounded bg-blue-600 text-white text-[11px]"
                          >
                            Save
                          </button>
                        </div>
                      ) : (
                        <p className="font-semibold text-xs text-slate-200 truncate">{file.name}</p>
                      )}
                      <p className="text-[10px] text-slate-500 font-mono truncate">{file.path}</p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => handleToggleFavorite(file.id)}
                      className={`p-1.5 rounded hover:bg-slate-800 transition-colors ${
                        file.isFavorite ? 'text-amber-400' : 'text-slate-500'
                      }`}
                      title="Favorite"
                    >
                      <Star className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => setSelectedFileForDetails(file)}
                      className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
                      title="File Details"
                    >
                      <Info className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => handleStartRename(file)}
                      className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
                      title="Rename"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => handleDownload(file)}
                      className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
                      title="Download"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => handleDeleteFile(file.id)}
                      className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-rose-400 transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Details Drawer */}
          {selectedFileForDetails && (
            <div className="w-full md:w-72 p-4 border-t md:border-t-0 md:border-l border-slate-800 bg-slate-950/80 font-mono text-xs space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <span className="font-bold text-slate-200">File Details</span>
                <button
                  onClick={() => setSelectedFileForDetails(null)}
                  className="text-slate-500 hover:text-slate-300"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <div>
                <span className="text-slate-500 block text-[10px]">FILE NAME:</span>
                <span className="text-slate-200 break-all">{selectedFileForDetails.name}</span>
              </div>

              <div>
                <span className="text-slate-500 block text-[10px]">PATH:</span>
                <span className="text-slate-400 break-all text-[11px]">{selectedFileForDetails.path}</span>
              </div>

              <div>
                <span className="text-slate-500 block text-[10px]">SIZE:</span>
                <span className="text-slate-300">{(selectedFileForDetails.size / 1024).toFixed(1)} KB</span>
              </div>

              <div>
                <span className="text-slate-500 block text-[10px]">LAST MODIFIED:</span>
                <span className="text-slate-300">
                  {new Date(selectedFileForDetails.updatedAt).toLocaleString()}
                </span>
              </div>

              <div>
                <span className="text-slate-500 block text-[10px]">FORMAT:</span>
                <span className="text-slate-300 uppercase">{selectedFileForDetails.language}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
