import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { studyListApi } from '../services/api';
import { TagBadge } from '../components/TagBadge';
import {
  BookMarked,
  Plus,
  Trash2,
  FolderOpen,
  ArrowRight,
  Loader2,
  X,
  FileQuestion,
  Layers,
} from 'lucide-react';

export const StudyLists = () => {
  const [lists, setLists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedList, setSelectedList] = useState(null);
  const [isCreating, setIsCreating] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [newListDesc, setNewListDesc] = useState('');

  useEffect(() => {
    loadLists();
  }, []);

  const loadLists = async () => {
    try {
      setLoading(true);
      const res = await studyListApi.getStudyLists();
      if (res.success) {
        setLists(res.data);
        if (res.data.length > 0 && !selectedList) {
          loadListDetail(res.data[0]._id);
        }
      }
    } catch (err) {
      console.error('Failed to load study lists:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadListDetail = async (id) => {
    try {
      const res = await studyListApi.getStudyListById(id);
      if (res.success) {
        setSelectedList(res.data);
      }
    } catch (err) {
      console.error('Failed to load list details:', err);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newListName.trim()) return;

    try {
      const res = await studyListApi.createStudyList({
        name: newListName.trim(),
        description: newListDesc.trim(),
      });
      if (res.success) {
        setNewListName('');
        setNewListDesc('');
        setIsCreating(false);
        await loadLists();
        setSelectedList(res.data);
      }
    } catch (err) {
      alert(err.message || 'Failed to create list');
    }
  };

  const handleDeleteList = async (id) => {
    if (!window.confirm('Delete this study list?')) return;
    try {
      await studyListApi.deleteStudyList(id);
      setSelectedList(null);
      await loadLists();
    } catch (err) {
      alert(err.message || 'Failed to delete list');
    }
  };

  const handleRemoveQuestion = async (questionId) => {
    if (!selectedList) return;
    try {
      const res = await studyListApi.updateStudyList(selectedList._id, {
        removeQuestionId: questionId,
      });
      if (res.success) {
        setSelectedList(res.data);
        loadLists();
      }
    } catch (err) {
      alert(err.message || 'Failed to remove question');
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-20 animate-fade-in">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-white flex items-center gap-3">
            <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
              <BookMarked className="w-6 h-6" />
            </div>
            Revision Study Lists
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1 font-sans">
            Curate questions into custom study modules for exam revision and viva preparation.
          </p>
        </div>

        <button
          onClick={() => setIsCreating(true)}
          className="btn-primary text-xs self-start sm:self-auto"
        >
          <Plus className="w-4 h-4 text-white" />
          <span>New Study List</span>
        </button>
      </div>

      {/* Create Modal Drawer */}
      {isCreating && (
        <div className="panel-elevated p-5 sm:p-6 rounded-2xl border border-blue-500/30 animate-scale-in">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-bold text-white text-base">Create New Study List</h3>
            <button
              onClick={() => setIsCreating(false)}
              className="text-slate-400 hover:text-white p-1 rounded-lg"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="block text-xs font-mono font-semibold text-slate-300 mb-1.5">
                List Title
              </label>
              <input
                type="text"
                required
                value={newListName}
                onChange={(e) => setNewListName(e.target.value)}
                placeholder="e.g. Operating Systems Final Viva, Dynamic Programming"
                className="w-full bg-[#080c14] border border-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-white placeholder:text-slate-500 px-4 py-2 text-xs sm:text-sm rounded-lg transition-colors font-sans"
              />
            </div>

            <div>
              <label className="block text-xs font-mono font-semibold text-slate-300 mb-1.5">
                Description (Optional)
              </label>
              <textarea
                value={newListDesc}
                onChange={(e) => setNewListDesc(e.target.value)}
                placeholder="Notes on what concepts this list covers..."
                rows={2}
                className="w-full bg-[#080c14] border border-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-white placeholder:text-slate-500 p-3 text-xs sm:text-sm rounded-lg transition-colors font-sans"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsCreating(false)}
                className="btn-secondary text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn-primary text-xs"
              >
                Save List
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Main Grid: Sidebar Lists + List Content */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left: Lists Menu */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs font-mono text-slate-400 px-1">
            <span className="uppercase tracking-wider font-semibold">Your Collections</span>
            <span className="tabular-nums">{lists.length} lists</span>
          </div>

          {loading && (
            <div className="panel-elevated p-6 text-center text-slate-400 text-xs border border-slate-800 font-mono">
              <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-blue-400" />
              Loading lists...
            </div>
          )}

          {!loading && lists.length === 0 && (
            <div className="panel-elevated p-6 text-center border border-slate-800">
              <FolderOpen className="w-8 h-8 text-slate-600 mx-auto mb-2" />
              <p className="text-xs text-slate-400">No study lists created yet.</p>
            </div>
          )}

          <div className="space-y-2">
            {lists.map((l) => {
              const isSelected = selectedList?._id === l._id;
              return (
                <button
                  key={l._id}
                  onClick={() => loadListDetail(l._id)}
                  className={`w-full text-left p-3.5 rounded-xl border transition-all flex items-start justify-between gap-3 ${
                    isSelected
                      ? 'bg-blue-600/15 border-blue-500/30 text-white'
                      : 'panel-base bg-[#0e1422] border-slate-800 hover:border-slate-700 text-slate-300'
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="font-display font-bold text-sm truncate">{l.name}</div>
                    {l.description && (
                      <p className="text-xs text-slate-400 truncate mt-0.5 font-sans">{l.description}</p>
                    )}
                    <span className="text-[11px] font-mono text-slate-500 mt-2 block tabular-nums">
                      {(l.questions || l.questionIds)?.length || 0} questions saved
                    </span>
                  </div>

                  <ArrowRight className={`w-4 h-4 shrink-0 mt-1 transition-transform ${isSelected ? 'text-blue-400 translate-x-0.5' : 'text-slate-600'}`} />
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: Selected List Questions Detail */}
        <div className="md:col-span-2">
          {selectedList ? (
            <div className="panel-elevated p-6 rounded-2xl border border-slate-800 space-y-6">
              {/* List Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
                <div>
                  <h2 className="font-display text-xl font-bold text-white flex items-center gap-2">
                    <FolderOpen className="w-5 h-5 text-blue-400" />
                    {selectedList.name}
                  </h2>
                  {selectedList.description && (
                    <p className="text-xs text-slate-400 mt-1 font-sans">{selectedList.description}</p>
                  )}
                </div>

                <button
                  onClick={() => handleDeleteList(selectedList._id)}
                  className="p-2 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors self-start sm:self-auto"
                  title="Delete Study List"
                  aria-label="Delete Study List"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {/* Questions inside List */}
              {(() => {
                const listQuestions = (selectedList.questions || selectedList.questionIds || []).filter(Boolean);

                if (listQuestions.length === 0) {
                  return (
                    <div className="py-12 text-center text-slate-500 space-y-2">
                      <FileQuestion className="w-10 h-10 text-slate-600 mx-auto" />
                      <p className="text-sm font-medium text-slate-300">This study list is empty</p>
                      <p className="text-xs text-slate-500 max-w-sm mx-auto font-sans">
                        Browse your inquiry history and click the bookmark icon to save concepts to this collection.
                      </p>
                      <Link
                        to="/"
                        className="btn-secondary text-xs mt-3 inline-flex items-center gap-1.5"
                      >
                        <span>Ask a Concept Now</span>
                      </Link>
                    </div>
                  );
                }

                return (
                  <div className="space-y-3">
                    {listQuestions.map((item) => {
                      const q = typeof item === 'object' ? item : { _id: item, rawQuestion: 'Saved Question' };
                      return (
                        <div
                          key={q._id}
                          className="p-4 rounded-xl bg-[#0a0f1a] border border-slate-800 hover:border-slate-700 transition-colors flex items-start justify-between gap-4 group"
                        >
                          <div className="space-y-1.5 flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              {q.subjectTag && <TagBadge tag={q.subjectTag} size="xs" />}
                              {q.createdAt && (
                                <span className="text-[10px] font-mono text-slate-500">
                                  {new Date(q.createdAt).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                            <Link
                              to={`/questions/${q._id}`}
                              className="font-display block text-sm font-bold text-white group-hover:text-blue-400 transition-colors truncate"
                            >
                              {q.rawQuestion || 'View Question'}
                            </Link>
                            {q.explanation && (
                              <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed font-sans">
                                {q.explanation.replace(/[#*`]/g, '')}
                              </p>
                            )}
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <Link
                              to={`/questions/${q._id}`}
                              className="btn-secondary text-xs py-1 px-2.5"
                            >
                              View
                            </Link>
                            <button
                              onClick={() => handleRemoveQuestion(q._id)}
                              className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                              title="Remove from list"
                              aria-label="Remove from list"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          ) : (
            <div className="panel-elevated p-12 text-center text-slate-500 border border-slate-800">
              <Layers className="w-10 h-10 text-slate-600 mx-auto mb-2" />
              <p className="text-sm font-medium text-slate-300">Select a study collection</p>
              <p className="text-xs text-slate-500 mt-1 font-sans">
                Choose a list on the left to review its concepts or create a new collection.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StudyLists;
