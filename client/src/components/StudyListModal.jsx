import React, { useState, useEffect } from 'react';
import { studyListApi } from '../services/api';
import { X, Plus, BookMarked, Check, Loader2 } from 'lucide-react';

export const StudyListModal = ({ isOpen, onClose, questionId, questionTitle }) => {
  const [lists, setLists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newListName, setNewListName] = useState('');
  const [creating, setCreating] = useState(false);
  const [savingId, setSavingId] = useState(null);
  const [savedSuccessMap, setSavedSuccessMap] = useState({});

  useEffect(() => {
    if (isOpen) {
      loadLists();
    }
  }, [isOpen]);

  const loadLists = async () => {
    try {
      setLoading(true);
      const res = await studyListApi.getStudyLists();
      if (res.success) {
        setLists(res.data);
      }
    } catch (err) {
      console.error('Failed to load study lists:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateList = async (e) => {
    e.preventDefault();
    if (!newListName.trim()) return;

    try {
      setCreating(true);
      const res = await studyListApi.createStudyList({
        name: newListName.trim(),
        questionId,
      });
      if (res.success) {
        setNewListName('');
        setSavedSuccessMap((prev) => ({ ...prev, [res.data._id]: true }));
        await loadLists();
      }
    } catch (err) {
      console.error('Failed to create study list:', err);
    } finally {
      setCreating(false);
    }
  };

  const handleAddToList = async (listId) => {
    try {
      setSavingId(listId);
      const res = await studyListApi.updateStudyList(listId, {
        addQuestionId: questionId,
      });
      if (res.success) {
        setSavedSuccessMap((prev) => ({ ...prev, [listId]: true }));
      }
    } catch (err) {
      console.error('Failed adding to list:', err);
    } finally {
      setSavingId(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className="panel-elevated rounded-2xl max-w-md w-full border border-slate-800 overflow-hidden shadow-2xl animate-scale-in">
        <div className="p-5 border-b border-slate-800 bg-[#0a0f1a] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-xl">
              <BookMarked className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-display font-bold text-white text-base">Save to Revision List</h3>
              <p className="text-xs font-mono text-slate-400 truncate max-w-[260px]">
                {questionTitle || 'Selected Inquiry'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close modal"
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Existing Lists */}
        <div className="p-5 max-h-60 overflow-y-auto space-y-2">
          {loading ? (
            <div className="py-8 flex items-center justify-center text-slate-400 text-xs font-mono">
              <Loader2 className="w-4 h-4 animate-spin mr-2 text-blue-400" /> Loading study collections...
            </div>
          ) : lists.length === 0 ? (
            <div className="py-6 text-center text-slate-500 text-xs">
              No study collections created yet. Create your first list below.
            </div>
          ) : (
            lists.map((l) => {
              const isSaved =
                savedSuccessMap[l._id] ||
                (l.questions || l.questionIds || []).some((q) => (q._id || q) === questionId);
              const isSaving = savingId === l._id;

              return (
                <div
                  key={l._id}
                  className="p-3 rounded-lg bg-[#080c14] border border-slate-800 flex items-center justify-between gap-3 hover:border-slate-700 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <span className="font-display font-semibold text-sm text-slate-200 block truncate">
                      {l.name}
                    </span>
                    <span className="text-[10px] font-mono text-slate-500">
                      {l.questions?.length || 0} questions saved
                    </span>
                  </div>

                  {isSaved ? (
                    <span className="inline-flex items-center gap-1 text-xs font-mono text-emerald-400 font-semibold px-2.5 py-1 rounded bg-emerald-500/10 border border-emerald-500/20">
                      <Check className="w-3.5 h-3.5" /> Saved
                    </span>
                  ) : (
                    <button
                      onClick={() => handleAddToList(l._id)}
                      disabled={isSaving}
                      className="btn-secondary text-xs py-1 px-3"
                    >
                      {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Add'}
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Create New List Form */}
        <form onSubmit={handleCreateList} className="p-5 border-t border-slate-800 bg-[#0a0f1a] flex gap-2">
          <label htmlFor="modal-new-list" className="sr-only">New list name</label>
          <input
            id="modal-new-list"
            type="text"
            value={newListName}
            onChange={(e) => setNewListName(e.target.value)}
            placeholder="New list name (e.g. Trees & Graphs)..."
            className="flex-1 bg-[#080c14] border border-slate-800 focus:border-blue-500 text-xs text-white placeholder:text-slate-500 px-3 py-2 rounded-lg transition-colors font-sans"
          />
          <button
            type="submit"
            disabled={creating || !newListName.trim()}
            className="btn-primary text-xs py-2 px-3 disabled:opacity-40"
          >
            {creating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">Create</span>
          </button>
        </form>
      </div>
    </div>
  );
};

export default StudyListModal;
