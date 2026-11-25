import React from 'react';
import { Link } from 'react-router-dom';
import { TagBadge } from './TagBadge';
import {
  Search,
  Calendar,
  BarChart3,
  Trash2,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  BookOpen,
} from 'lucide-react';

export const HistoryTable = ({
  questions = [],
  total = 0,
  pages = 1,
  currentPage = 1,
  searchTerm = '',
  onSearchChange,
  selectedTag = 'all',
  onTagChange,
  tags = [],
  onPageChange,
  onDelete,
  isLoading = false,
}) => {
  return (
    <div className="space-y-4">
      {/* Search and Filter Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 panel-elevated p-4 border border-slate-800">
        {/* Search Input */}
        <div className="relative flex-1">
          <label htmlFor="search-history" className="sr-only">Search concepts or explanations</label>
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            id="search-history"
            type="text"
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search concepts, algorithms, or topics..."
            className="w-full bg-[#080c14] border border-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-white placeholder:text-slate-500 pl-10 pr-4 py-2 text-xs sm:text-sm rounded-lg transition-colors font-sans"
          />
        </div>

        {/* Tag Selector */}
        <div className="flex items-center gap-2">
          <label htmlFor="tag-filter" className="text-xs font-mono text-slate-400 shrink-0">Subject:</label>
          <select
            id="tag-filter"
            value={selectedTag}
            onChange={(e) => onTagChange(e.target.value)}
            className="bg-[#080c14] border border-slate-800 focus:border-blue-500 text-xs font-mono px-3 py-2 rounded-lg text-slate-200 cursor-pointer"
          >
            <option value="all" className="bg-[#0e1422]">All Subjects</option>
            {tags.map((t) => (
              <option key={t} value={t} className="bg-[#0e1422]">
                {t.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Questions List */}
      {isLoading ? (
        <div className="panel-elevated p-12 text-center text-slate-400 text-sm border border-slate-800">
          <div className="w-8 h-8 border-2 border-blue-500/20 border-t-blue-400 rounded-full animate-spin mx-auto mb-3" />
          <span className="font-mono text-xs text-slate-400">Loading learning history...</span>
        </div>
      ) : questions.length === 0 ? (
        <div className="panel-elevated p-12 text-center text-slate-500 border border-slate-800">
          <BookOpen className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <h4 className="font-display font-bold text-slate-300 text-base">No inquiries found</h4>
          <p className="text-xs text-slate-500 mt-1 font-sans">
            {searchTerm || selectedTag !== 'all'
              ? 'Try adjusting your search query or subject filter.'
              : 'Ask your first concept question to build your personal learning history!'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {questions.map((q) => (
            <div
              key={q._id}
              className="panel-base p-5 border border-slate-800 hover:border-slate-700 bg-[#0e1422] transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4 group"
            >
              <div className="space-y-2 flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <TagBadge tag={q.subjectTag} size="xs" />
                  {q.chartData && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-md bg-blue-500/10 border border-blue-500/20 text-blue-300 font-semibold">
                      <BarChart3 className="w-3 h-3 text-blue-400" />
                      Visual Chart
                    </span>
                  )}
                  <span className="text-xs font-mono text-slate-500 flex items-center gap-1 ml-auto sm:ml-0">
                    <Calendar className="w-3 h-3" />
                    {new Date(q.createdAt).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </span>
                </div>

                <Link
                  to={`/questions/${q._id}`}
                  className="font-display block text-base font-bold text-white group-hover:text-blue-400 transition-colors truncate"
                >
                  {q.rawQuestion}
                </Link>

                <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed font-sans">
                  {q.explanation?.replace(/[#*`]/g, '')}
                </p>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                <Link
                  to={`/questions/${q._id}`}
                  className="btn-secondary text-xs py-1.5 px-3"
                >
                  <span>Review</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </Link>

                {onDelete && (
                  <button
                    onClick={() => onDelete(q._id)}
                    title="Delete from History"
                    aria-label="Delete question"
                    className="p-2 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg border border-transparent hover:border-rose-500/20 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination Controls */}
      {pages > 1 && (
        <div className="flex items-center justify-between panel-elevated px-4 py-3 border border-slate-800 text-xs font-mono">
          <span className="text-slate-400">
            Page {currentPage} of {pages} ({total} inquiries)
          </span>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              aria-label="Previous page"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage === pages}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              aria-label="Next page"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default HistoryTable;
