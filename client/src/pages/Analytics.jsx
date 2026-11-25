import React, { useState, useEffect } from 'react';
import { analyticsApi, feedbackApi } from '../services/api';
import { TagBadge } from '../components/TagBadge';
import { Bar, Doughnut } from 'react-chartjs-2';
import {
  BarChart2,
  Users,
  HelpCircle,
  Star,
  MessageSquare,
  TrendingUp,
  Award,
  Loader2,
  Calendar,
} from 'lucide-react';

export const Analytics = () => {
  const [data, setData] = useState(null);
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      const [analyticsRes, feedbackRes] = await Promise.all([
        analyticsApi.getTeacherAnalytics(),
        feedbackApi.getFeedbackFeed({ limit: 10 }),
      ]);

      if (analyticsRes.success) {
        setData(analyticsRes.data);
      }
      if (feedbackRes.success) {
        setFeedbacks(feedbackRes.data);
      }
    } catch (err) {
      console.error('Failed to load teacher analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="py-24 text-center">
        <Loader2 className="w-8 h-8 text-blue-400 animate-spin mx-auto mb-3" />
        <p className="text-xs font-mono text-slate-400">Aggregating department analytics...</p>
      </div>
    );
  }

  const summary = data?.summary || {};
  const questionsPerTag = data?.questionsPerTag || [];
  const tagRatings = data?.tagRatings || [];
  const mostAskedTopics = data?.mostAskedTopics || [];

  // Subject Tag Distribution Chart Data
  const tagLabels = questionsPerTag.map((item) =>
    item.tag.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())
  );
  const tagCounts = questionsPerTag.map((item) => item.count);

  const subjectChartConfig = {
    labels: tagLabels,
    datasets: [
      {
        data: tagCounts,
        backgroundColor: [
          'rgba(59, 130, 246, 0.85)',
          'rgba(16, 185, 129, 0.85)',
          'rgba(245, 158, 11, 0.85)',
          'rgba(139, 92, 246, 0.85)',
          'rgba(239, 68, 68, 0.85)',
          'rgba(14, 165, 233, 0.85)',
        ],
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 1,
      },
    ],
  };

  // Average Rating per Tag Chart Data
  const ratingLabels = tagRatings.map((item) =>
    item.tag.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())
  );
  const ratingValues = tagRatings.map((item) => item.avgRating);

  const ratingChartConfig = {
    labels: ratingLabels,
    datasets: [
      {
        label: 'Average Viva Rating (out of 5)',
        data: ratingValues,
        backgroundColor: 'rgba(245, 158, 11, 0.85)',
        borderRadius: 6,
      },
    ],
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-20 animate-fade-in">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <BarChart2 className="w-6 h-6" />
            </div>
            <div>
              <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-white">
                Faculty Curriculum Intelligence
              </h1>
              <p className="text-xs sm:text-sm text-slate-400 mt-0.5 font-sans">
                Real-time student comprehension metrics, topic frequencies, and viva rating distributions.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono px-3 py-1.5 rounded-lg bg-[#0a0f1a] border border-slate-800 text-slate-400 self-start sm:self-auto">
          <Calendar className="w-3.5 h-3.5 text-blue-400" />
          <span>Department Aggregate</span>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Inquiries', val: summary.totalQuestions || 0, icon: HelpCircle, color: 'text-blue-400', bg: 'bg-blue-500/10' },
          { label: 'Active Students',  val: summary.totalStudents || 0,  icon: Users,      color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
          { label: 'Average Viva Score',val: summary.avgRating ? `${summary.avgRating} / 5` : 'N/A', icon: Star, color: 'text-amber-400', bg: 'bg-amber-500/10' },
          { label: 'Curated Lists',    val: summary.totalStudyLists || 0, icon: Award,    color: 'text-purple-400', bg: 'bg-purple-500/10' },
        ].map((kpi, idx) => {
          const Icon = kpi.icon;
          return (
            <div key={idx} className="panel-base p-5 border border-slate-800 bg-[#0e1422]">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-mono uppercase text-slate-500 font-semibold">{kpi.label}</span>
                <div className={`p-1.5 rounded-lg ${kpi.bg} ${kpi.color}`}>
                  <Icon className="w-4 h-4" />
                </div>
              </div>
              <div className="font-display text-2xl sm:text-3xl font-bold text-white tabular-nums">
                {kpi.val}
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Subject Distribution */}
        <div className="panel-elevated p-6 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-display font-bold text-white text-base">Inquiries by Subject Area</h3>
            <span className="text-xs font-mono text-slate-500">Distribution</span>
          </div>
          <div className="h-64 flex items-center justify-center">
            {tagCounts.length > 0 ? (
              <Doughnut
                data={subjectChartConfig}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: { position: 'bottom', labels: { color: '#94a3b8', boxWidth: 12, font: { size: 11 } } },
                  },
                }}
              />
            ) : (
              <p className="text-xs font-mono text-slate-500">No subject data recorded yet.</p>
            )}
          </div>
        </div>

        {/* Viva Ratings by Subject */}
        <div className="panel-elevated p-6 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-display font-bold text-white text-base">Student Comprehension Ratings</h3>
            <span className="text-xs font-mono text-slate-500">1-5 Scale</span>
          </div>
          <div className="h-64 flex items-center justify-center">
            {ratingValues.length > 0 ? (
              <Bar
                data={ratingChartConfig}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  scales: {
                    y: { min: 0, max: 5, ticks: { color: '#64748b', font: { size: 10 } }, grid: { color: 'rgba(148,163,184,0.08)' } },
                    x: { ticks: { color: '#94a3b8', font: { size: 11 } }, grid: { display: false } },
                  },
                  plugins: {
                    legend: { display: false },
                  },
                }}
              />
            ) : (
              <p className="text-xs font-mono text-slate-500">No ratings recorded yet.</p>
            )}
          </div>
        </div>
      </div>

      {/* Tables Row: Most Asked Topics & Student Feedback Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Most Asked Topics */}
        <div className="panel-elevated p-6 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-display font-bold text-white text-base flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-blue-400" />
              Highest Frequency Concept Queries
            </h3>
          </div>

          <div className="space-y-2.5">
            {mostAskedTopics.length === 0 ? (
              <p className="text-xs font-mono text-slate-500 py-6 text-center">No queries logged yet.</p>
            ) : (
              mostAskedTopics.map((topic, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-3 rounded-lg bg-[#0a0f1a] border border-slate-800/80"
                >
                  <div className="flex items-center gap-3 min-w-0 pr-3">
                    <span className="w-5 h-5 rounded-md bg-blue-500/15 text-blue-400 font-mono text-xs font-bold flex items-center justify-center shrink-0">
                      {i + 1}
                    </span>
                    <span className="text-sm font-medium text-slate-200 truncate capitalize font-sans">
                      {topic._id}
                    </span>
                  </div>
                  <span className="text-xs font-mono font-semibold px-2.5 py-0.5 rounded bg-slate-800 text-slate-300 shrink-0 tabular-nums">
                    {topic.count} asks
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Student Feedback Feed */}
        <div className="panel-elevated p-6 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-display font-bold text-white text-base flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-amber-400" />
              Recent Student Feedback Feed
            </h3>
          </div>

          <div className="space-y-2.5">
            {feedbacks.length === 0 ? (
              <p className="text-xs font-mono text-slate-500 py-6 text-center">No student ratings submitted yet.</p>
            ) : (
              feedbacks.slice(0, 5).map((fb) => (
                <div
                  key={fb._id}
                  className="p-3 rounded-lg bg-[#0a0f1a] border border-slate-800/80 space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-300 truncate max-w-[240px] font-sans">
                      {fb.questionId?.rawQuestion || 'Concept Question'}
                    </span>
                    <div className="flex items-center gap-1 text-amber-400 text-xs font-mono font-bold">
                      <Star className="w-3.5 h-3.5 fill-amber-400" />
                      <span>{fb.rating} / 5</span>
                    </div>
                  </div>
                  {fb.comment && (
                    <p className="text-xs text-slate-400 font-sans italic">"{fb.comment}"</p>
                  )}
                  <div className="text-[10px] font-mono text-slate-500 flex items-center justify-between">
                    <span>{fb.userId?.name || 'Student'}</span>
                    <span>{new Date(fb.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analytics;
