import React, { useState } from 'react';
import {
  Brain,
  Search,
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  Sparkles,
  Download,
  Upload,
  AlertTriangle,
  Tag,
  Calendar,
} from 'lucide-react';
import { MemoryItem } from '../../types';
import {
  getStoredMemories,
  addMemory,
  updateMemory,
  deleteMemory,
  toggleMemoryStatus,
  clearConversationMemories,
  saveStoredMemories,
} from '../../services/memoryStore';

interface MemoryCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onMemoriesUpdated: () => void;
}

export const MemoryCenterModal: React.FC<MemoryCenterModalProps> = ({
  isOpen,
  onClose,
  onMemoriesUpdated,
}) => {
  const [memories, setMemories] = useState<MemoryItem[]>(getStoredMemories());
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editKey, setEditKey] = useState('');
  const [editContent, setEditContent] = useState('');
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newKey, setNewKey] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newCategory, setNewCategory] = useState<MemoryItem['category']>('preference');
  const [newTags, setNewTags] = useState('');
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  if (!isOpen) return null;

  const refresh = () => {
    const loaded = getStoredMemories();
    setMemories(loaded);
    onMemoriesUpdated();
  };

  const handleToggleActive = (id: string) => {
    toggleMemoryStatus(id);
    refresh();
  };

  const handleDelete = (id: string) => {
    deleteMemory(id);
    refresh();
  };

  const handleStartEdit = (item: MemoryItem) => {
    setEditingId(item.id);
    setEditKey(item.key);
    setEditContent(item.content);
  };

  const handleSaveEdit = (id: string) => {
    if (!editKey.trim() || !editContent.trim()) return;
    updateMemory(id, { key: editKey, content: editContent });
    setEditingId(null);
    refresh();
  };

  const handleCreateNew = () => {
    if (!newKey.trim() || !newContent.trim()) return;
    addMemory({
      key: newKey.trim(),
      content: newContent.trim(),
      category: newCategory,
      tags: newTags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
    });
    setNewKey('');
    setNewContent('');
    setNewTags('');
    setIsAddingNew(false);
    refresh();
  };

  const handleClearMemories = () => {
    clearConversationMemories();
    setShowClearConfirm(false);
    refresh();
  };

  const handleExport = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(memories, null, 2));
    const dlAnchor = document.createElement('a');
    dlAnchor.setAttribute('href', dataStr);
    dlAnchor.setAttribute('download', `radhe_krishna_memories_${Date.now()}.json`);
    dlAnchor.click();
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileReader = new FileReader();
    if (e.target.files && e.target.files[0]) {
      fileReader.readAsText(e.target.files[0], 'UTF-8');
      fileReader.onload = (event) => {
        try {
          const parsed = JSON.parse(event.target?.result as string);
          if (Array.isArray(parsed)) {
            saveStoredMemories(parsed);
            refresh();
          }
        } catch (err) {
          alert('Invalid memory file format.');
        }
      };
    }
  };

  const filteredMemories = memories.filter((m) => {
    const matchesCat = selectedCategory === 'all' || m.category === selectedCategory;
    const matchesQuery =
      !searchQuery.trim() ||
      m.key.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCat && matchesQuery;
  });

  const categories = [
    { id: 'all', label: 'All Memories' },
    { id: 'preference', label: 'Preferences' },
    { id: 'project', label: 'Projects' },
    { id: 'decision', label: 'Decisions' },
    { id: 'goal', label: 'Goals' },
    { id: 'workflow', label: 'Workflows' },
    { id: 'instruction', label: 'Instructions' },
    { id: 'biography', label: 'Biography' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[88vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-purple-500/20 text-purple-300 border border-purple-500/30">
              <Brain className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                Memory Center
                <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-300 border border-purple-500/20 font-mono">
                  {memories.filter((m) => m.active).length} Active Memories
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Persistent memory database for Suraj Rajput with automatic context injection.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExport}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs flex items-center gap-1.5 transition-colors"
              title="Export Memories to JSON"
            >
              <Download className="w-3.5 h-3.5" /> Export
            </button>
            <label className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs flex items-center gap-1.5 transition-colors cursor-pointer">
              <Upload className="w-3.5 h-3.5" /> Import
              <input type="file" accept=".json" onChange={handleImport} className="hidden" />
            </label>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Search & Category Filter Bar */}
        <div className="px-6 py-3 border-b border-slate-800 bg-slate-900/50 flex flex-wrap items-center justify-between gap-3">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search memories by keyword, topic, or tag..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-purple-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsAddingNew(true)}
              className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-medium flex items-center gap-1.5 shadow-md shadow-purple-600/20 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> Add Memory
            </button>
            <button
              onClick={() => setShowClearConfirm(true)}
              className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-rose-950/60 hover:text-rose-300 text-slate-400 text-xs transition-colors"
              title="Clear Conversation History Memories"
            >
              Clear
            </button>
          </div>
        </div>

        {/* Category Pills */}
        <div className="px-6 py-2 border-b border-slate-800/80 bg-slate-950/30 flex items-center gap-1.5 overflow-x-auto text-xs">
          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedCategory(c.id)}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                selectedCategory === c.id
                  ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>

        {/* Add New Memory Form Card */}
        {isAddingNew && (
          <div className="p-4 mx-6 my-3 rounded-xl bg-slate-950 border border-purple-500/40 shadow-xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-purple-300 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" /> New Long-Term Memory
              </span>
              <button onClick={() => setIsAddingNew(false)} className="text-slate-500 hover:text-slate-300">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <input
                type="text"
                placeholder="Title / Key (e.g., Tech Stack Preference)"
                value={newKey}
                onChange={(e) => setNewKey(e.target.value)}
                className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-slate-200 focus:outline-none focus:border-purple-500"
              />
              <select
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value as any)}
                className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-slate-200 focus:outline-none focus:border-purple-500"
              >
                <option value="preference">Preference</option>
                <option value="project">Project</option>
                <option value="decision">Decision</option>
                <option value="goal">Goal</option>
                <option value="workflow">Workflow</option>
                <option value="instruction">Instruction</option>
                <option value="biography">Biography</option>
              </select>
            </div>
            <textarea
              placeholder="Detailed memory content to remember across sessions..."
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              rows={2}
              className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-slate-200 focus:outline-none focus:border-purple-500"
            />
            <div className="flex items-center justify-between gap-2">
              <input
                type="text"
                placeholder="Tags separated by commas (e.g. dev, react, priority)"
                value={newTags}
                onChange={(e) => setNewTags(e.target.value)}
                className="flex-1 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-slate-200 focus:outline-none focus:border-purple-500"
              />
              <button
                onClick={handleCreateNew}
                className="px-4 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold"
              >
                Save Memory
              </button>
            </div>
          </div>
        )}

        {/* Clear Confirmation Prompt */}
        {showClearConfirm && (
          <div className="p-4 mx-6 my-2 rounded-xl bg-rose-950/40 border border-rose-600/50 flex items-center justify-between">
            <div className="flex items-center gap-2 text-rose-300 text-xs">
              <AlertTriangle className="w-4 h-4" />
              <span>Clear conversation memories? Core biographical preferences for Suraj will be retained.</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleClearMemories}
                className="px-3 py-1 bg-rose-600 hover:bg-rose-500 text-white text-xs rounded-lg font-medium"
              >
                Yes, Clear
              </button>
              <button
                onClick={() => setShowClearConfirm(false)}
                className="px-3 py-1 bg-slate-800 text-slate-300 text-xs rounded-lg"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Memory Items List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3">
          {filteredMemories.length === 0 ? (
            <div className="text-center py-16 text-slate-500">
              <Brain className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm font-medium">No memories found</p>
              <p className="text-xs text-slate-600 mt-1">
                Try adjusting your search query or add a new memory manually.
              </p>
            </div>
          ) : (
            filteredMemories.map((mem) => {
              const isEditing = editingId === mem.id;

              return (
                <div
                  key={mem.id}
                  className={`p-4 rounded-xl border transition-all ${
                    mem.active
                      ? 'bg-slate-950/70 border-slate-800 hover:border-purple-500/40'
                      : 'bg-slate-950/30 border-slate-900 opacity-60'
                  }`}
                >
                  {isEditing ? (
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={editKey}
                        onChange={(e) => setEditKey(e.target.value)}
                        className="w-full px-3 py-1 rounded bg-slate-900 border border-slate-700 text-xs text-slate-100 font-bold"
                      />
                      <textarea
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        rows={2}
                        className="w-full px-3 py-1 rounded bg-slate-900 border border-slate-700 text-xs text-slate-200"
                      />
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => handleSaveEdit(mem.id)}
                          className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs flex items-center gap-1"
                        >
                          <Check className="w-3.5 h-3.5" /> Save
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="px-3 py-1 bg-slate-800 text-slate-300 rounded text-xs"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-sm text-slate-200">{mem.key}</span>
                          <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-purple-500/10 text-purple-300 border border-purple-500/20">
                            {mem.category}
                          </span>
                          {!mem.active && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono">
                              Disabled
                            </span>
                          )}
                        </div>

                        {/* Controls */}
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleToggleActive(mem.id)}
                            className={`px-2 py-1 rounded text-[11px] font-mono transition-colors ${
                              mem.active
                                ? 'text-emerald-400 hover:bg-emerald-950/40'
                                : 'text-slate-500 hover:bg-slate-800'
                            }`}
                            title={mem.active ? 'Disable memory' : 'Enable memory'}
                          >
                            {mem.active ? 'Active' : 'Disabled'}
                          </button>
                          <button
                            onClick={() => handleStartEdit(mem)}
                            className="p-1.5 text-slate-400 hover:text-slate-200 rounded hover:bg-slate-800 transition-colors"
                            title="Edit Memory"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(mem.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-400 rounded hover:bg-slate-800 transition-colors"
                            title="Delete Memory"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <p className="text-xs text-slate-300 mt-2 leading-relaxed">{mem.content}</p>

                      <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-900 text-[11px] text-slate-500">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <Tag className="w-3 h-3 text-slate-600" />
                          {mem.tags.map((t) => (
                            <span key={t} className="text-slate-400 bg-slate-900 px-1.5 py-0.5 rounded text-[10px]">
                              #{t}
                            </span>
                          ))}
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-slate-600" />
                          <span>{new Date(mem.updatedAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
