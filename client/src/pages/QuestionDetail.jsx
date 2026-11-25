import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { questionApi } from '../services/api';
import ReactMarkdown from 'react-markdown';
import { TagBadge } from '../components/TagBadge';
import { ChartView } from '../components/ChartView';
import { SlideDeckView } from '../components/SlideDeckView';
import { AlgorithmVisualizer } from '../components/AlgorithmVisualizer';
import { StudyListModal } from '../components/StudyListModal';
import { RatingModal } from '../components/RatingModal';
import { ShortsModal } from '../components/ShortsModal';
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  BookMarked,
  Star,
  Baby,
  Trash2,
  Sparkles,
  Loader2,
  AlertCircle,
  Copy,
  Check,
  Presentation,
  FileText,
  Send,
  MessageSquare,
  User,
  Lightbulb,
  Video,
  Activity,
} from 'lucide-react';

export const QuestionDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [question, setQuestion] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('full'); // 'ppt' | 'visualizer' | 'full' | 'simplified'
  const [isStudyListOpen, setIsStudyListOpen] = useState(false);
  const [isRatingOpen, setIsRatingOpen] = useState(false);
  const [isShortsOpen, setIsShortsOpen] = useState(false);
  const [isSimplifying, setIsSimplifying] = useState(false);
  const [copied, setCopied] = useState(false);
  const [followUpInput, setFollowUpInput] = useState('');
  const [isFollowUpStreaming, setIsFollowUpStreaming] = useState(false);
  const [currentFollowUpChunk, setCurrentFollowUpChunk] = useState('');

  const threadEndRef = useRef(null);

  useEffect(() => {
    loadQuestion();
  }, [id]);

  useEffect(() => {
    if (question) {
      const hasTrace = Boolean(question.visualizationTrace?.steps?.length > 0);
      if (hasTrace) {
        setActiveTab('visualizer');
      } else {
        setActiveTab(Array.isArray(question.slides) && question.slides.length > 0 ? 'ppt' : 'full');
      }
    }
  }, [question]);

  useEffect(() => {
    if (question?.followUps?.length > 0 || isFollowUpStreaming) {
      threadEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [question?.followUps, isFollowUpStreaming, currentFollowUpChunk]);

  const loadQuestion = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await questionApi.getQuestionById(id);
      if (res.success && res.data) {
        setQuestion(res.data);
      }
    } catch (err) {
      setError(err.message || 'Failed to load concept details');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!question?.explanation) return;
    await navigator.clipboard.writeText(question.explanation);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSimplify = async () => {
    if (question.simplifiedVersion) {
      setActiveTab('simplified');
      return;
    }

    try {
      setIsSimplifying(true);
      const res = await questionApi.simplifyQuestion(question._id);
      if (res.success) {
        setQuestion((prev) => ({
          ...prev,
          isSimplified: true,
          simplifiedVersion: res.simplifiedVersion,
        }));
        setActiveTab('simplified');
      }
    } catch (err) {
      alert(err.message || 'Failed to generate simplified explanation');
    } finally {
      setIsSimplifying(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Delete this inquiry from your history?')) return;
    try {
      await questionApi.deleteQuestion(id);
      navigate('/history');
    } catch (err) {
      alert(err.message || 'Failed to delete inquiry');
    }
  };

  const handleSendFollowUp = async (e) => {
    e?.preventDefault();
    const prompt = followUpInput.trim();
    if (!prompt || isFollowUpStreaming) return;

    setFollowUpInput('');
    setIsFollowUpStreaming(true);
    setCurrentFollowUpChunk('');

    // Optimistically append user message to thread
    const newMsg = { role: 'user', content: prompt, createdAt: new Date() };
    setQuestion((prev) => ({
      ...prev,
      followUps: [...(prev.followUps || []), newMsg],
    }));

    try {
      await questionApi.askFollowUpStream(
        question._id,
        prompt,
        (chunk) => setCurrentFollowUpChunk((prev) => prev + chunk),
        (data) => {
          setIsFollowUpStreaming(false);
          setCurrentFollowUpChunk('');
          setQuestion((prev) => ({
            ...prev,
            followUps: data.followUps || prev.followUps,
          }));
        },
        (err) => {
          setIsFollowUpStreaming(false);
          alert(err.message || 'Failed to stream follow-up');
        }
      );
    } catch (err) {
      setIsFollowUpStreaming(false);
      console.error(err);
    }
  };

  const shortsTopic =
    (question?.searchKeywords && question.searchKeywords[0]) ||
    (question?.rawQuestion ? question.rawQuestion.replace(/^(explain|what is the difference between|what is|what are|how does|how do|compare|which is the best|which is better|which is)\s+/i, '').replace(/[?!.]+$/, '').trim() : '') ||
    question?.subjectTag ||
    'computer science';

  const suggestionPills = React.useMemo(() => {
    const q = (question?.rawQuestion || '').toLowerCase();
    if (q.includes('c') && q.includes('python')) {
      return [
        'Show a memory leak example in C',
        "How does Python's GIL actually work?",
        'Explain pointers in C with memory diagram',
      ];
    }
    if (q.includes('recursion')) {
      return [
        'What happens if base case is missing?',
        'Show recursion with Fibonacci & memoization',
        'How to convert recursion into an iterative loop?',
      ];
    }
    if (q.includes('gaming') || q.includes('distro')) {
      return [
        'Explain Proton DXVK vs VKD3D pipeline',
        'Why does Nobara perform better than stock Fedora?',
        'How do fsync and futex2 kernel patches work?',
      ];
    }
    return [
      'Give me a runnable code example',
      'What are the most common viva questions on this?',
      'How does this work under the hood in memory?',
    ];
  }, [question?.rawQuestion]);

  if (loading) {
    return (
      <div className="py-24 text-center">
        <Loader2 className="w-8 h-8 text-blue-400 animate-spin mx-auto mb-3" />
        <p className="text-xs font-mono text-slate-400">Loading inquiry details...</p>
      </div>
    );
  }

  if (error || !question) {
    return (
      <div className="max-w-md mx-auto my-16 p-8 panel-elevated text-center space-y-4 border border-rose-500/30">
        <AlertCircle className="w-10 h-10 text-rose-400 mx-auto" />
        <h3 className="font-display font-bold text-white text-base">Inquiry Not Found</h3>
        <p className="text-xs text-slate-400 font-sans">{error || 'This question does not exist or you do not have permission to view it.'}</p>
        <Link
          to="/history"
          className="btn-primary text-xs"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to History
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20 animate-fade-in">
      {/* Top Navigation & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#0a0f1a] p-3 rounded-xl border border-slate-800">
        <Link
          to="/history"
          className="inline-flex items-center gap-1.5 text-xs font-mono font-semibold text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to History
        </Link>

        {/* View Mode Pills */}
        <div
          role="tablist"
          aria-label="Inquiry view modes"
          className="flex items-center gap-1.5 p-1 rounded-lg bg-[#0e1422] border border-slate-800/80 self-start sm:self-auto"
        >
          {question.visualizationTrace?.steps?.length > 0 && (
            <button
              role="tab"
              id="tab-detail-visualizer"
              aria-controls="panel-detail-visualizer"
              aria-selected={activeTab === 'visualizer'}
              onClick={() => setActiveTab('visualizer')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-semibold transition-all focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none ${
                activeTab === 'visualizer'
                  ? 'bg-blue-600/20 text-blue-300 border border-blue-500/30'
                  : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
              }`}
            >
              <Activity className="w-3.5 h-3.5 text-blue-400" />
              <span>Algorithm Visualizer</span>
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
            </button>
          )}

          {question.slides?.length > 0 && (
            <button
              role="tab"
              id="tab-detail-ppt"
              aria-controls="panel-detail-ppt"
              aria-selected={activeTab === 'ppt'}
              onClick={() => setActiveTab('ppt')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-semibold transition-all focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:outline-none ${
                activeTab === 'ppt'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
              }`}
            >
              <Presentation className="w-3.5 h-3.5 text-amber-400" />
              <span>Slides ({question.slides.length})</span>
            </button>
          )}

          <button
            role="tab"
            id="tab-detail-full"
            aria-controls="panel-detail-full"
            aria-selected={activeTab === 'full'}
            onClick={() => setActiveTab('full')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-semibold transition-all focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none ${
              activeTab === 'full'
                ? 'bg-blue-600/20 text-blue-300 border border-blue-500/30'
                : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
            }`}
          >
            <FileText className="w-3.5 h-3.5 text-blue-400" />
            <span>{question.slides?.length > 0 ? 'Documentation' : 'Answer'}</span>
          </button>

          <button
            role="tab"
            id="tab-detail-simplified"
            aria-controls="panel-detail-simplified"
            aria-selected={activeTab === 'simplified'}
            onClick={handleSimplify}
            disabled={isSimplifying}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-semibold transition-all focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:outline-none ${
              activeTab === 'simplified'
                ? 'bg-purple-600/20 text-purple-300 border border-purple-500/30'
                : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
            }`}
          >
            <Baby className="w-3.5 h-3.5 text-purple-400" />
            <span>ELI5</span>
          </button>
        </div>

        {/* Action icons */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopy}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
            title="Copy explanation"
            aria-label="Copy explanation"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
          </button>

          <button
            onClick={() => setIsStudyListOpen(true)}
            className="p-1.5 text-slate-400 hover:text-blue-400 hover:bg-slate-800 rounded-lg transition-colors"
            title="Save to Study List"
            aria-label="Save to Study List"
          >
            <BookMarked className="w-4 h-4" />
          </button>

          <button
            onClick={() => setIsRatingOpen(true)}
            className="p-1.5 text-slate-400 hover:text-amber-400 hover:bg-slate-800 rounded-lg transition-colors"
            title="Rate answer"
            aria-label="Rate answer"
          >
            <Star className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => {
              navigate(`/shorts?topic=${encodeURIComponent(shortsTopic)}&prompt=${encodeURIComponent(question?.rawQuestion || '')}`);
            }}
            title="Watch related shorts"
            className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-md bg-red-600/15 hover:bg-red-600/25 text-red-300 border border-red-500/30 transition-colors"
          >
            <Video className="w-3.5 h-3.5 text-red-400" />
            <span>Shorts</span>
          </button>

          <button
            onClick={handleDelete}
            className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
            title="Delete inquiry"
            aria-label="Delete inquiry"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ── Active View ── */}
      {activeTab === 'visualizer' && question.visualizationTrace && (
        <div role="tabpanel" id="panel-detail-visualizer" aria-labelledby="tab-detail-visualizer">
          <AlgorithmVisualizer
            trace={question.visualizationTrace}
            customPrompt={question.rawQuestion}
          />
        </div>
      )}

      {activeTab === 'ppt' && (
        <div role="tabpanel" id="panel-detail-ppt" aria-labelledby="tab-detail-ppt">
          <SlideDeckView
            rawQuestion={question.rawQuestion}
            refinedPrompt={question.refinedPrompt}
            explanation={question.explanation}
            keyPoints={question.keyPoints}
            slides={question.slides}
            chartData={question.chartData}
            subjectTag={question.subjectTag}
            hasVisualizer={Boolean(question.visualizationTrace?.steps?.length > 0)}
            onOpenVisualizer={() => setActiveTab('visualizer')}
          />
        </div>
      )}

      {activeTab === 'full' && (
        <div
          role="tabpanel"
          id="panel-detail-full"
          aria-labelledby="tab-detail-full"
          className="panel-elevated p-6 sm:p-8 space-y-6 border border-slate-800"
        >
          <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-800">
            <div className="flex items-center gap-2 flex-wrap">
              <TagBadge tag={question.subjectTag} size="sm" />
              <span className="text-xs font-mono text-slate-500 flex items-center gap-1 font-medium">
                <Calendar className="w-3.5 h-3.5" />
                {new Date(question.createdAt).toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </span>
            </div>
            {question.isCached && (
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                ⚡ Cached in Redis
              </span>
            )}
          </div>

          <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-white capitalize leading-tight">
            {question.rawQuestion}
          </h1>

          {question.refinedPrompt && (
            <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4 text-xs font-mono text-slate-300">
              <span className="font-bold text-blue-300 flex items-center gap-1.5 mb-1.5">
                <Sparkles className="w-3.5 h-3.5 text-blue-400" /> Refined Prompt Spec
              </span>
              <p className="leading-relaxed font-mono text-slate-400">"{question.refinedPrompt}"</p>
            </div>
          )}

          <div className="prose-dark max-w-none">
            <ReactMarkdown>{question.explanation}</ReactMarkdown>
          </div>

          {question.keyPoints?.length > 0 && (
            <div className="rounded-xl bg-[#0a0f1a] border border-slate-800 p-5 space-y-3">
              <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Key Conceptual Takeaways
              </h4>
              <ul className="space-y-2.5">
                {question.keyPoints.map((pt, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm text-slate-300">
                    <span className="mt-1 w-5 h-5 rounded-md bg-blue-500/15 border border-blue-500/30 text-blue-400 text-[10px] font-mono font-bold flex items-center justify-center shrink-0">
                      {i + 1}
                    </span>
                    <span className="leading-relaxed font-sans">{pt}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {question.chartData && (
            <div className="rounded-xl border border-slate-800 bg-[#0a0f1a] p-4">
              <ChartView chartData={question.chartData} />
            </div>
          )}
        </div>
      )}

      {activeTab === 'simplified' && (
        <div
          role="tabpanel"
          id="panel-detail-simplified"
          aria-labelledby="tab-detail-simplified"
          className="panel-elevated p-6 sm:p-8 space-y-4 border border-purple-500/25 animate-fade-in"
        >
          <div className="flex items-center gap-2 text-purple-300 font-display font-bold text-sm">
            <Baby className="w-5 h-5 text-purple-400" />
            <span>First-Principles Intuitive Analogy (ELI5)</span>
          </div>
          {isSimplifying ? (
            <div className="py-8 text-center text-xs font-mono text-purple-300 animate-pulse">
              Translating formal abstractions into everyday conceptual models...
            </div>
          ) : (
            <p className="text-slate-300 text-sm sm:text-base leading-relaxed whitespace-pre-line font-sans">
              {question.simplifiedVersion || 'Simplified version ready.'}
            </p>
          )}
        </div>
      )}

      {/* ── Follow-up Conversation Thread ── */}
      <div className="space-y-5 pt-4">
        <div className="flex items-center gap-3">
          <div className="h-px bg-slate-800 flex-1" />
          <span className="text-[11px] font-mono font-semibold uppercase tracking-wider text-slate-400 px-3 py-1 rounded-md bg-[#0a0f1a] border border-slate-800 flex items-center gap-1.5">
            <MessageSquare className="w-3.5 h-3.5 text-blue-400" />
            <span>Interactive Follow-up Thread</span>
          </span>
          <div className="h-px bg-slate-800 flex-1" />
        </div>

        {question.followUps && question.followUps.length > 0 && (
          <div className="space-y-4">
            {question.followUps.map((msg, idx) => (
              <div
                key={idx}
                className={`flex gap-3.5 ${
                  msg.role === 'user' ? 'justify-end' : 'justify-start'
                } animate-fade-up`}
              >
                {msg.role === 'assistant' && (
                  <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0 mt-1 shadow-sm font-mono text-xs font-bold">
                    C
                  </div>
                )}

                <div
                  className={`max-w-[85%] rounded-xl p-5 ${
                    msg.role === 'user'
                      ? 'bg-[#182238] text-white border border-blue-500/30'
                      : 'panel-elevated border border-slate-800 text-slate-200'
                  }`}
                >
                  {msg.role === 'user' ? (
                    <p className="text-sm font-medium leading-relaxed font-sans">{msg.content}</p>
                  ) : (
                    <div className="prose-dark max-w-none text-sm space-y-3">
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    </div>
                  )}

                  {msg.role === 'assistant' && msg.slides && msg.slides.length > 0 && (
                    <div className="pt-3 border-t border-slate-800 mt-3">
                      <button
                        type="button"
                        onClick={() => {
                          setActiveTab('ppt');
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-semibold transition-colors"
                      >
                        <Presentation className="w-3.5 h-3.5" />
                        <span>View Interactive Slides ({msg.slides.length} slides)</span>
                      </button>
                    </div>
                  )}

                  <span className="text-[10px] text-slate-500 block text-right mt-2 font-mono">
                    {new Date(msg.createdAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>

                {msg.role === 'user' && (
                  <div className="w-8 h-8 rounded-lg bg-[#141d2e] border border-slate-700/60 text-slate-300 flex items-center justify-center shrink-0 mt-1">
                    <User className="w-4 h-4" />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {isFollowUpStreaming && (
          <div className="flex gap-3.5 justify-start animate-fade-in">
            <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0 mt-1 shadow-sm font-mono text-xs font-bold">
              C
            </div>

            <div className="max-w-[85%] rounded-xl p-5 panel-elevated border border-blue-500/30 text-slate-200">
              {currentFollowUpChunk ? (
                <div className="prose-dark max-w-none text-sm">
                  <ReactMarkdown>{currentFollowUpChunk}</ReactMarkdown>
                  <span className="cursor-blink" />
                </div>
              ) : (
                <div className="flex items-center gap-2 text-xs font-mono text-blue-400 py-1">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Clario is synthesizing technical response...</span>
                </div>
              )}
            </div>
          </div>
        )}

        <div ref={threadEndRef} />

        {/* Follow-up input form */}
        <div className="panel-elevated p-4 sm:p-5 border border-slate-800 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-mono uppercase text-slate-500 flex items-center gap-1.5 shrink-0 font-semibold">
              <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
              Suggested inquiries:
            </span>
            {suggestionPills.map((pill, i) => (
              <button
                key={i}
                type="button"
                disabled={isFollowUpStreaming}
                onClick={() => {
                  setFollowUpInput(pill);
                }}
                className="px-2.5 py-1 rounded-md text-xs font-medium bg-[#101726] hover:bg-[#162035] border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white transition-colors disabled:opacity-40"
              >
                {pill}
              </button>
            ))}
          </div>

          <form onSubmit={handleSendFollowUp} className="relative flex items-center gap-2">
            <label htmlFor="detail-followup" className="sr-only">Ask a follow-up question</label>
            <input
              id="detail-followup"
              type="text"
              value={followUpInput}
              onChange={(e) => setFollowUpInput(e.target.value)}
              placeholder="Inquire further on this concept... (e.g., 'Show benchmark test code')"
              disabled={isFollowUpStreaming}
              className="w-full bg-[#080c14] border border-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-white placeholder:text-slate-500 text-xs sm:text-sm rounded-lg px-4 py-2.5 pr-12 transition-colors font-sans"
            />

            <button
              type="submit"
              disabled={!followUpInput.trim() || isFollowUpStreaming}
              className="btn-primary absolute right-1.5 w-8 h-8 p-0 rounded-md disabled:opacity-30 disabled:cursor-not-allowed"
              title="Send follow-up"
              aria-label="Send follow-up"
            >
              {isFollowUpStreaming ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
              ) : (
                <Send className="w-3.5 h-3.5 text-white" />
              )}
            </button>
          </form>
        </div>
      </div>

      {/* Modals */}
      <ShortsModal
        isOpen={isShortsOpen}
        onClose={() => setIsShortsOpen(false)}
        topic={shortsTopic}
        prompt={question?.rawQuestion || ''}
      />
      <StudyListModal
        isOpen={isStudyListOpen}
        onClose={() => setIsStudyListOpen(false)}
        questionId={question._id}
        questionTitle={question.rawQuestion}
      />
      <RatingModal
        isOpen={isRatingOpen}
        onClose={() => setIsRatingOpen(false)}
        questionId={question._id}
        questionTitle={question.rawQuestion}
      />
    </div>
  );
};

export default QuestionDetail;
