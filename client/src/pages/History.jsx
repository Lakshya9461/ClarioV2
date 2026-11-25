import React, { useState, useEffect, useCallback } from 'react';
import { questionApi } from '../services/api';
import { HistoryTable } from '../components/HistoryTable';
import { History as HistoryIcon, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';

export const History = () => {
  const [questions, setQuestions] = useState([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTag, setSelectedTag] = useState('all');
  const [tags, setTags] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    questionApi.getTags().then((res) => {
      if (res.success && Array.isArray(res.data)) {
        setTags(res.data);
      }
    });
  }, []);

  const loadQuestions = useCallback(async () => {
    try {
      setIsLoading(true);
      const params = {
        page: currentPage,
        limit: 10,
        self: 'true',
      };
      if (selectedTag && selectedTag !== 'all') {
        params.tag = selectedTag;
      }
      if (searchTerm.trim()) {
        params.search = searchTerm.trim();
      }

      const res = await questionApi.getQuestions(params);
      if (res.success) {
        setQuestions(res.data);
        setTotal(res.total);
        setPages(res.pages);
      }
    } catch (err) {
      console.error('Failed to load history:', err);
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, selectedTag, searchTerm]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadQuestions();
    }, 250);
    return () => clearTimeout(timer);
  }, [loadQuestions]);

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this inquiry from your history?')) {
      return;
    }

    try {
      await questionApi.deleteQuestion(id);
      loadQuestions();
    } catch (err) {
      alert(err.message || 'Failed to delete question');
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-20 animate-fade-in">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-white flex items-center gap-3">
            <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
              <HistoryIcon className="w-6 h-6" />
            </div>
            Learning History
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1 font-sans">
            Review all previously generated concepts, slide decks, and empirical benchmark charts.
          </p>
        </div>

        <Link
          to="/"
          className="btn-primary text-xs self-start sm:self-auto"
        >
          <Sparkles className="w-4 h-4 text-white" />
          <span>New Inquiry</span>
        </Link>
      </div>

      {/* History Table */}
      <HistoryTable
        questions={questions}
        total={total}
        pages={pages}
        currentPage={currentPage}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        selectedTag={selectedTag}
        onTagChange={setSelectedTag}
        tags={tags}
        onPageChange={setCurrentPage}
        onDelete={handleDelete}
        isLoading={isLoading}
      />
    </div>
  );
};

export default History;
