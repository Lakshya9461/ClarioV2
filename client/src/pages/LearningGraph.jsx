import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  BookOpen,
  Check,
  GitBranch,
  Loader2,
  Plus,
  Play,
  Save,
} from 'lucide-react';
import { learningGraphApi, questionApi } from '../services/api';

const slugify = (value) =>
  value
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 64);

const statusLabel = {
  unknown: 'Not assessed',
  developing: 'Developing',
  demonstrated: 'Demonstrated',
};

const planStatusLabel = {
  proposed: 'Draft path',
  active: 'In progress',
  completed: 'Completed',
};

export const LearningGraph = () => {
  const [graph, setGraph] = useState({ concepts: [], relationships: [] });
  const [sessions, setSessions] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [selectedSessionId, setSelectedSessionId] = useState('');
  const [assessmentDrafts, setAssessmentDrafts] = useState({});
  const [conceptForm, setConceptForm] = useState({ conceptId: '', name: '', statement: '' });
  const [relationshipForm, setRelationshipForm] = useState({
    from: '',
    to: '',
    type: 'prerequisite',
  });
  const [goalConceptId, setGoalConceptId] = useState('');
  const [progressEvidence, setProgressEvidence] = useState('');
  const [questionLink, setQuestionLink] = useState({ questionId: '', kind: 'predict' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const loadData = async (preferredSessionId) => {
    try {
      const [graphResponse, sessionsResponse, questionsResponse] = await Promise.all([
        learningGraphApi.getGraph(),
        learningGraphApi.getSessions(),
        questionApi.getQuestions({ page: 1, limit: 100, self: 'true' }),
      ]);
      const nextGraph = graphResponse.data;
      const nextSessions = sessionsResponse.data;

      setGraph(nextGraph);
      setSessions(nextSessions);
      setQuestions(questionsResponse.data || []);
      setAssessmentDrafts(
        Object.fromEntries(
          nextGraph.concepts.map((concept) => [
            concept.conceptId,
            {
              status: concept.assessment.status,
              evidence: concept.assessment.evidence.join('\n'),
            },
          ])
        )
      );
      setGoalConceptId((current) =>
        nextGraph.concepts.some((concept) => concept.conceptId === current)
          ? current
          : nextGraph.concepts[0]?.conceptId || ''
      );
      setSelectedSessionId((current) => {
        const preferred = preferredSessionId || current;
        return nextSessions.some((session) => session._id === preferred)
          ? preferred
          : nextSessions[0]?._id || '';
      });
      setError('');
    } catch (loadError) {
      setError(loadError.message || 'Could not load the learning map.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const selectedSession = sessions.find((session) => session._id === selectedSessionId);

  const handleConceptNameChange = (name) => {
    setConceptForm((current) => ({ ...current, name, conceptId: slugify(name) }));
  };

  const handleCreateConcept = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    setNotice('');
    try {
      await learningGraphApi.createConcept({
        ...conceptForm,
        name: conceptForm.name.trim(),
        statement: conceptForm.statement.trim(),
      });
      setConceptForm({ conceptId: '', name: '', statement: '' });
      setNotice('Concept added to your graph.');
      await loadData();
    } catch (saveError) {
      setError(saveError.message || 'Could not add the concept.');
    } finally {
      setSaving(false);
    }
  };

  const handleAddRelationship = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    setNotice('');
    try {
      await learningGraphApi.addRelationship(relationshipForm);
      setNotice('Relationship added.');
      await loadData();
    } catch (saveError) {
      setError(saveError.message || 'Could not add the relationship.');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAssessment = async (conceptId) => {
    const draft = assessmentDrafts[conceptId];
    if (!draft) return;
    setSaving(true);
    setError('');
    setNotice('');
    try {
      await learningGraphApi.updateAssessment(conceptId, {
        status: draft.status,
        evidence: draft.evidence
          .split('\n')
          .map((line) => line.trim())
          .filter(Boolean),
      });
      setNotice('Learner assessment saved. Practice does not automatically change this status.');
      await loadData(selectedSessionId);
    } catch (saveError) {
      setError(saveError.message || 'Could not save the learner assessment.');
    } finally {
      setSaving(false);
    }
  };

  const handleCreatePath = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const response = await learningGraphApi.createSession(goalConceptId);
      setSelectedSessionId(response.data._id);
      setNotice('Draft path created. Review and accept it before starting.');
      await loadData(response.data._id);
    } catch (saveError) {
      setError(saveError.message || 'Could not create the learning path.');
    } finally {
      setSaving(false);
    }
  };

  const handleAcceptPath = async () => {
    if (!selectedSession) return;
    setSaving(true);
    setError('');
    setNotice('');
    try {
      await learningGraphApi.acceptSession(selectedSession._id);
      setNotice('Learning path accepted. Work through the current step, then record it as practiced.');
      await loadData(selectedSession._id);
    } catch (saveError) {
      setError(saveError.message || 'Could not accept the learning path.');
    } finally {
      setSaving(false);
    }
  };

  const handleAdvancePath = async () => {
    if (!selectedSession?.plan.currentNodeId) return;
    setSaving(true);
    setError('');
    setNotice('');
    try {
      await learningGraphApi.advanceSession(selectedSession._id, {
        nodeId: selectedSession.plan.currentNodeId,
        evidence: progressEvidence.trim(),
      });
      setProgressEvidence('');
      setNotice('Practice recorded. This does not mark the concept as mastered.');
      await loadData(selectedSession._id);
    } catch (saveError) {
      setError(saveError.message || 'Could not record this practice step.');
    } finally {
      setSaving(false);
    }
  };

  const handleLinkQuestion = async (event) => {
    event.preventDefault();
    if (!selectedSession?.plan.currentNodeId || !questionLink.questionId) return;
    setSaving(true);
    setError('');
    setNotice('');
    try {
      await learningGraphApi.linkQuestion(selectedSession._id, {
        ...questionLink,
        nodeId: selectedSession.plan.currentNodeId,
      });
      setQuestionLink((current) => ({ ...current, questionId: '' }));
      setNotice('Tutor question linked to the current plan step.');
      await loadData(selectedSession._id);
    } catch (saveError) {
      setError(saveError.message || 'Could not link the tutor question.');
    } finally {
      setSaving(false);
    }
  };

  const currentNode = selectedSession?.plan.nodes.find(
    (node) => node.id === selectedSession.plan.currentNodeId
  );
  const linkedQuestions =
    selectedSession?.questions.filter((link) => link.nodeId === selectedSession.plan.currentNodeId) || [];

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-blue-300">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        Loading your learning map...
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-20 animate-fade-in">
      <div className="border-b border-slate-800 pb-4">
        <h1 className="flex items-center gap-3 font-display text-2xl font-extrabold text-white sm:text-3xl">
          <span className="rounded-xl border border-blue-500/20 bg-blue-500/10 p-2 text-blue-400">
            <GitBranch className="h-6 w-6" />
          </span>
          Learning Map
        </h1>
        <p className="mt-2 max-w-3xl text-sm text-slate-400">
          Build a personal concept graph, record evidence about your understanding, and create
          prerequisite-first study paths. Clario does not infer mastery from practice.
        </p>
      </div>

      {error && (
        <div role="alert" className="flex items-start gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-200">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          {error}
        </div>
      )}
      {notice && (
        <div role="status" className="rounded-xl border border-emerald-500/25 bg-emerald-500/10 p-3 text-sm text-emerald-200">
          {notice}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <section className="panel-base space-y-4 rounded-2xl p-5">
          <div className="flex items-center gap-2">
            <Plus className="h-4 w-4 text-blue-400" />
            <h2 className="font-display font-bold text-white">Concept graph</h2>
          </div>
          <form onSubmit={handleCreateConcept} className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-xs font-semibold text-slate-300">
                Concept name
                <input
                  required
                  minLength={2}
                  maxLength={120}
                  value={conceptForm.name}
                  onChange={(event) => handleConceptNameChange(event.target.value)}
                  placeholder="e.g. Recursion"
                  className="mt-1.5 w-full rounded-lg border border-slate-800 bg-[#080c14] px-3 py-2 text-sm text-white"
                />
              </label>
              <label className="text-xs font-semibold text-slate-300">
                Concept ID
                <input
                  required
                  pattern="[a-z0-9]+([-_][a-z0-9]+)*"
                  maxLength={64}
                  value={conceptForm.conceptId}
                  onChange={(event) =>
                    setConceptForm((current) => ({ ...current, conceptId: event.target.value }))
                  }
                  className="mt-1.5 w-full rounded-lg border border-slate-800 bg-[#080c14] px-3 py-2 font-mono text-sm text-white"
                />
              </label>
            </div>
            <label className="block text-xs font-semibold text-slate-300">
              What does this concept mean?
              <textarea
                rows={2}
                maxLength={1000}
                value={conceptForm.statement}
                onChange={(event) =>
                  setConceptForm((current) => ({ ...current, statement: event.target.value }))
                }
                placeholder="Optional short description"
                className="mt-1.5 w-full rounded-lg border border-slate-800 bg-[#080c14] px-3 py-2 text-sm text-white"
              />
            </label>
            <button disabled={saving} className="btn-primary text-xs disabled:opacity-50">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Add concept
            </button>
          </form>

          <form onSubmit={handleAddRelationship} className="grid gap-2 border-t border-slate-800 pt-4 sm:grid-cols-[1fr_auto_1fr_auto]">
            <select
              aria-label="Relationship source concept"
              required
              value={relationshipForm.from}
              onChange={(event) => setRelationshipForm((current) => ({ ...current, from: event.target.value }))}
              className="rounded-lg border border-slate-800 bg-[#080c14] px-2 py-2 text-xs text-white"
            >
              <option value="">From concept</option>
              {graph.concepts.map((concept) => (
                <option key={concept.conceptId} value={concept.conceptId}>{concept.name}</option>
              ))}
            </select>
            <select
              aria-label="Relationship type"
              value={relationshipForm.type}
              onChange={(event) => setRelationshipForm((current) => ({ ...current, type: event.target.value }))}
              className="rounded-lg border border-slate-800 bg-[#080c14] px-2 py-2 text-xs text-white"
            >
              <option value="prerequisite">must understand first</option>
              <option value="related">is related to</option>
            </select>
            <select
              aria-label="Relationship target concept"
              required
              value={relationshipForm.to}
              onChange={(event) => setRelationshipForm((current) => ({ ...current, to: event.target.value }))}
              className="rounded-lg border border-slate-800 bg-[#080c14] px-2 py-2 text-xs text-white"
            >
              <option value="">To concept</option>
              {graph.concepts.map((concept) => (
                <option key={concept.conceptId} value={concept.conceptId}>{concept.name}</option>
              ))}
            </select>
            <button
              disabled={saving || graph.concepts.length < 2}
              aria-label="Add relationship"
              className="btn-secondary justify-center px-3 text-xs disabled:opacity-50"
            >
              <Plus className="h-4 w-4" />
            </button>
          </form>

          <div className="space-y-2 border-t border-slate-800 pt-4">
            {graph.concepts.length === 0 ? (
              <p className="text-sm text-slate-500">Add concepts to start building your graph.</p>
            ) : (
              graph.concepts.map((concept) => {
                const draft = assessmentDrafts[concept.conceptId] || {
                  status: concept.assessment.status,
                  evidence: concept.assessment.evidence.join('\n'),
                };
                return (
                  <article key={concept.conceptId} className="rounded-xl border border-slate-800 bg-[#0b111c] p-3">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <h3 className="text-sm font-bold text-white">{concept.name}</h3>
                        <p className="font-mono text-[10px] text-slate-500">{concept.conceptId}</p>
                        {concept.statement && <p className="mt-1 text-xs text-slate-400">{concept.statement}</p>}
                      </div>
                      <span className="rounded-md border border-slate-700 px-2 py-1 text-[10px] text-slate-300">
                        {statusLabel[concept.assessment.status]}
                      </span>
                    </div>
                    <div className="mt-3 grid gap-2 sm:grid-cols-[150px_1fr_auto] sm:items-end">
                      <label className="text-[11px] font-semibold text-slate-400">
                        Understanding
                        <select
                          value={draft.status}
                          onChange={(event) =>
                            setAssessmentDrafts((current) => ({
                              ...current,
                              [concept.conceptId]: { ...draft, status: event.target.value },
                            }))
                          }
                          className="mt-1 w-full rounded-lg border border-slate-800 bg-[#080c14] px-2 py-2 text-xs text-white"
                        >
                          <option value="unknown">Not assessed</option>
                          <option value="developing">Developing</option>
                          <option value="demonstrated">Demonstrated</option>
                        </select>
                      </label>
                      <label className="text-[11px] font-semibold text-slate-400">
                        Evidence, one note per line
                        <textarea
                          rows={2}
                          value={draft.evidence}
                          onChange={(event) =>
                            setAssessmentDrafts((current) => ({
                              ...current,
                              [concept.conceptId]: { ...draft, evidence: event.target.value },
                            }))
                          }
                          className="mt-1 w-full rounded-lg border border-slate-800 bg-[#080c14] px-2 py-2 text-xs text-white"
                        />
                      </label>
                      <button
                        type="button"
                        disabled={saving}
                        onClick={() => handleSaveAssessment(concept.conceptId)}
                        className="btn-secondary justify-center text-xs disabled:opacity-50"
                      >
                        <Save className="h-3.5 w-3.5" />
                        Save
                      </button>
                    </div>
                  </article>
                );
              })
            )}
          </div>

          {graph.relationships.length > 0 && (
            <div className="border-t border-slate-800 pt-3">
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Relationships</h3>
              <div className="flex flex-wrap gap-2">
                {graph.relationships.map((relationship, index) => {
                  const from = graph.concepts.find((concept) => concept.conceptId === relationship.from)?.name;
                  const to = graph.concepts.find((concept) => concept.conceptId === relationship.to)?.name;
                  return (
                    <span key={`${relationship.from}-${relationship.to}-${index}`} className="rounded-lg border border-slate-800 bg-[#0b111c] px-2.5 py-1.5 text-[11px] text-slate-300">
                      {from} {relationship.type === 'prerequisite' ? '→ must precede →' : '↔'} {to}
                    </span>
                  );
                })}
              </div>
            </div>
          )}
        </section>

        <section className="space-y-6">
          <div className="panel-base space-y-4 rounded-2xl p-5">
            <div className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-blue-400" />
              <h2 className="font-display font-bold text-white">Create a learning path</h2>
            </div>
            <p className="text-xs leading-relaxed text-slate-400">
              Clario orders unmet prerequisites before the goal and skips prerequisites marked
              demonstrated. Related concepts do not change path order.
            </p>
            <form onSubmit={handleCreatePath} className="flex flex-col gap-2 sm:flex-row">
              <select
                required
                value={goalConceptId}
                onChange={(event) => setGoalConceptId(event.target.value)}
                disabled={!graph.concepts.length}
                className="min-w-0 flex-1 rounded-lg border border-slate-800 bg-[#080c14] px-3 py-2 text-sm text-white"
              >
                {graph.concepts.length === 0 && <option value="">Add a concept first</option>}
                {graph.concepts.map((concept) => (
                  <option key={concept.conceptId} value={concept.conceptId}>{concept.name}</option>
                ))}
              </select>
              <button disabled={saving || !graph.concepts.length} className="btn-primary justify-center text-xs disabled:opacity-50">
                <Plus className="h-4 w-4" />
                Draft path
              </button>
            </form>
          </div>

          <div className="panel-base space-y-4 rounded-2xl p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-display font-bold text-white">Your paths</h2>
                <p className="mt-1 text-xs text-slate-500">Review each draft before accepting it.</p>
              </div>
              {sessions.length > 0 && (
                <select
                  aria-label="Select learning path"
                  value={selectedSessionId}
                  onChange={(event) => setSelectedSessionId(event.target.value)}
                  className="max-w-full rounded-lg border border-slate-800 bg-[#080c14] px-2 py-2 text-xs text-white"
                >
                  {sessions.map((session) => (
                    <option key={session._id} value={session._id}>
                      {session.goalName} · {planStatusLabel[session.status]}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {!selectedSession ? (
              <p className="rounded-xl border border-dashed border-slate-800 p-5 text-center text-sm text-slate-500">
                No learning paths yet. Create a draft from one of your graph concepts.
              </p>
            ) : (
              <>
                <div className="flex items-center justify-between rounded-xl border border-blue-500/20 bg-blue-500/5 p-3">
                  <div>
                    <p className="text-sm font-bold text-white">{selectedSession.goalName}</p>
                    <p className="mt-0.5 text-[11px] text-slate-400">
                      {selectedSession.plan.nodes.length} steps · {planStatusLabel[selectedSession.status]}
                    </p>
                  </div>
                  {selectedSession.status === 'proposed' && (
                    <button disabled={saving} onClick={handleAcceptPath} className="btn-primary text-xs disabled:opacity-50">
                      <Play className="h-3.5 w-3.5" />
                      Accept path
                    </button>
                  )}
                  {selectedSession.status === 'completed' && (
                    <span className="flex items-center gap-1 text-xs text-emerald-300">
                      <Check className="h-4 w-4" />
                      Complete
                    </span>
                  )}
                </div>

                <ol className="space-y-2">
                  {selectedSession.plan.nodes.map((node, index) => (
                    <li
                      key={node.id}
                      className={`flex items-center gap-3 rounded-xl border p-3 ${
                        node.id === selectedSession.plan.currentNodeId
                          ? 'border-blue-500/40 bg-blue-500/10'
                          : node.status === 'completed'
                            ? 'border-emerald-500/20 bg-emerald-500/5'
                            : 'border-slate-800 bg-[#0b111c]'
                      }`}
                    >
                      <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                        node.status === 'completed'
                          ? 'bg-emerald-500/15 text-emerald-300'
                          : node.id === selectedSession.plan.currentNodeId
                            ? 'bg-blue-500/20 text-blue-300'
                            : 'bg-slate-800 text-slate-400'
                      }`}>
                        {node.status === 'completed' ? <Check className="h-4 w-4" /> : index + 1}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-medium text-slate-100">{node.title}</span>
                        <span className="text-[10px] text-slate-500">
                          {node.status === 'completed'
                            ? 'Practiced'
                            : node.id === selectedSession.plan.currentNodeId
                              ? 'Current step'
                              : 'Upcoming'}
                        </span>
                      </span>
                    </li>
                  ))}
                </ol>

                {selectedSession.status === 'active' && currentNode && (
                  <div className="space-y-3 rounded-xl border border-slate-800 bg-[#0b111c] p-3">
                    <form onSubmit={handleLinkQuestion} className="space-y-2">
                      <p className="text-xs font-semibold text-slate-300">
                        Link a saved tutor question to “{currentNode.title}”
                      </p>
                      {questions.length === 0 ? (
                        <p className="text-xs text-slate-500">
                          Ask a question in the <a href="/" className="text-blue-300 underline">tutor console</a>, then return here to link it.
                        </p>
                      ) : (
                        <div className="flex flex-col gap-2 sm:flex-row">
                          <select
                            required
                            aria-label="Saved tutor question"
                            value={questionLink.questionId}
                            onChange={(event) =>
                              setQuestionLink((current) => ({ ...current, questionId: event.target.value }))
                            }
                            className="min-w-0 flex-1 rounded-lg border border-slate-800 bg-[#080c14] px-2 py-2 text-xs text-white"
                          >
                            <option value="">Select a saved question</option>
                            {questions
                              .filter(
                                (question) =>
                                  !selectedSession.questions.some(
                                    (link) =>
                                      String(link.questionId) === question._id &&
                                      link.nodeId === currentNode.id
                                  )
                              )
                              .map((question) => (
                                <option key={question._id} value={question._id}>
                                  {question.rawQuestion.slice(0, 100)}
                                </option>
                              ))}
                          </select>
                          <select
                            aria-label="Question phase"
                            value={questionLink.kind}
                            onChange={(event) =>
                              setQuestionLink((current) => ({ ...current, kind: event.target.value }))
                            }
                            className="rounded-lg border border-slate-800 bg-[#080c14] px-2 py-2 text-xs text-white"
                          >
                            <option value="predict">Predict</option>
                            <option value="check">Check</option>
                          </select>
                          <button
                            disabled={saving || !questionLink.questionId}
                            className="btn-secondary justify-center text-xs disabled:opacity-50"
                          >
                            <Plus className="h-3.5 w-3.5" />
                            Link question
                          </button>
                        </div>
                      )}
                    </form>
                    {linkedQuestions.length > 0 && (
                      <ul className="space-y-1">
                        {linkedQuestions.map((link, index) => {
                          const question = questions.find((item) => item._id === String(link.questionId));
                          return (
                            <li key={`${link.questionId}-${index}`} className="text-[11px] text-slate-400">
                              <span className="mr-1 rounded bg-slate-800 px-1.5 py-0.5 uppercase text-[9px] text-blue-300">
                                {link.kind}
                              </span>
                              {question?.rawQuestion || `Saved question ${String(link.questionId).slice(-6)}`}
                            </li>
                          );
                        })}
                      </ul>
                    )}
                    <label className="block text-xs font-semibold text-slate-300">
                      Practice note (optional)
                      <textarea
                        rows={2}
                        maxLength={1000}
                        value={progressEvidence}
                        onChange={(event) => setProgressEvidence(event.target.value)}
                        placeholder="Record what you practiced or where you got stuck."
                        className="mt-1.5 w-full rounded-lg border border-slate-800 bg-[#080c14] px-3 py-2 text-xs text-white"
                      />
                    </label>
                    <button disabled={saving} onClick={handleAdvancePath} className="btn-secondary text-xs disabled:opacity-50">
                      <Check className="h-4 w-4" />
                      Mark “{currentNode.title}” practiced
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};
