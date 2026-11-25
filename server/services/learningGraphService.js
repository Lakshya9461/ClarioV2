export class LearningGraphError extends Error {
  constructor(message, status = 400, code = 'invalid_learning_graph') {
    super(message);
    this.name = 'LearningGraphError';
    this.status = status;
    this.code = code;
  }
}

const isValidConceptId = (value) =>
  typeof value === 'string' &&
  value.length <= 64 &&
  /^[a-z0-9]+(?:[-_][a-z0-9]+)*$/.test(value);

const prerequisiteEdges = (relationships = []) =>
  relationships.filter((relationship) => relationship.type === 'prerequisite');

const hasCycle = (conceptIds, relationships) => {
  const adjacency = new Map(conceptIds.map((id) => [id, []]));
  const indegree = new Map(conceptIds.map((id) => [id, 0]));

  for (const { from, to } of relationships) {
    adjacency.get(from).push(to);
    indegree.set(to, indegree.get(to) + 1);
  }

  const ready = conceptIds.filter((id) => indegree.get(id) === 0);
  let visited = 0;

  while (ready.length > 0) {
    const current = ready.shift();
    visited += 1;

    for (const next of adjacency.get(current)) {
      indegree.set(next, indegree.get(next) - 1);
      if (indegree.get(next) === 0) ready.push(next);
    }
  }

  return visited !== conceptIds.length;
};

export const validateConcept = (concept) => {
  if (!concept || !isValidConceptId(concept.conceptId)) {
    throw new LearningGraphError(
      'Concept ID must be a lowercase slug using letters, numbers, hyphens, or underscores.'
    );
  }

  if (typeof concept.name !== 'string' || concept.name.trim().length < 2 || concept.name.trim().length > 120) {
    throw new LearningGraphError('Concept name must contain 2 to 120 characters.');
  }

  if (typeof concept.statement !== 'string' || concept.statement.trim().length > 1000) {
    throw new LearningGraphError('Concept statement cannot exceed 1000 characters.');
  }

  return {
    conceptId: concept.conceptId,
    name: concept.name.trim(),
    statement: concept.statement.trim(),
  };
};

export const validateRelationship = (graph, relationship) => {
  const concepts = graph.concepts || [];
  const conceptIds = new Set(concepts.map((concept) => concept.conceptId));

  if (!conceptIds.has(relationship.from) || !conceptIds.has(relationship.to)) {
    throw new LearningGraphError('Both relationship endpoints must exist in the learner graph.', 404, 'concept_not_found');
  }

  if (relationship.from === relationship.to) {
    throw new LearningGraphError('A concept cannot depend on itself.');
  }

  const relationships = graph.relationships || [];
  const duplicate = relationships.some(
    (existing) =>
      existing.type === relationship.type &&
      ((existing.from === relationship.from && existing.to === relationship.to) ||
        (relationship.type === 'related' &&
          existing.from === relationship.to &&
          existing.to === relationship.from))
  );
  if (duplicate) {
    throw new LearningGraphError('This relationship already exists.', 409, 'relationship_exists');
  }

  if (relationship.type === 'prerequisite') {
    const prerequisites = prerequisiteEdges(relationships);
    const candidateEdges = [...prerequisites, relationship];
    if (hasCycle([...conceptIds], candidateEdges)) {
      throw new LearningGraphError(
        'Prerequisite relationships must form a directed acyclic graph.',
        409,
        'prerequisite_cycle'
      );
    }
  }

  return relationship;
};

export const buildLearningPlan = (graph, goalConceptId) => {
  const concepts = graph.concepts || [];
  const conceptById = new Map(concepts.map((concept) => [concept.conceptId, concept]));
  const goal = conceptById.get(goalConceptId);

  if (!goal) {
    throw new LearningGraphError('Goal concept was not found in the learner graph.', 404, 'concept_not_found');
  }

  const allPrerequisites = prerequisiteEdges(graph.relationships || []);
  const conceptIds = [...conceptById.keys()];
  if (allPrerequisites.some(({ from, to }) => !conceptById.has(from) || !conceptById.has(to))) {
    throw new LearningGraphError('The learner graph contains a relationship to a missing concept.');
  }
  if (hasCycle(conceptIds, allPrerequisites)) {
    throw new LearningGraphError(
      'The learner graph contains a prerequisite cycle.',
      409,
      'prerequisite_cycle'
    );
  }

  const included = new Set([goalConceptId]);
  const pending = [goalConceptId];

  while (pending.length > 0) {
    const dependentId = pending.pop();
    for (const edge of allPrerequisites) {
      if (edge.to !== dependentId) continue;

      const prerequisite = conceptById.get(edge.from);
      if (prerequisite.assessment?.status === 'demonstrated' || included.has(edge.from)) continue;

      included.add(edge.from);
      pending.push(edge.from);
    }
  }

  const selectedIds = concepts
    .map((concept) => concept.conceptId)
    .filter((conceptId) => included.has(conceptId));
  const selectedEdges = allPrerequisites.filter(
    ({ from, to }) => included.has(from) && included.has(to)
  );
  const indegree = new Map(selectedIds.map((conceptId) => [conceptId, 0]));
  const outgoing = new Map(selectedIds.map((conceptId) => [conceptId, []]));

  for (const { from, to } of selectedEdges) {
    outgoing.get(from).push(to);
    indegree.set(to, indegree.get(to) + 1);
  }

  const orderIndex = new Map(selectedIds.map((conceptId, index) => [conceptId, index]));
  const ready = selectedIds.filter((conceptId) => indegree.get(conceptId) === 0);
  const orderedIds = [];

  while (ready.length > 0) {
    ready.sort((left, right) => orderIndex.get(left) - orderIndex.get(right));
    const current = ready.shift();
    orderedIds.push(current);

    for (const next of outgoing.get(current)) {
      indegree.set(next, indegree.get(next) - 1);
      if (indegree.get(next) === 0) ready.push(next);
    }
  }

  if (orderedIds.length !== selectedIds.length) {
    throw new LearningGraphError(
      'The learner graph contains a prerequisite cycle.',
      409,
      'prerequisite_cycle'
    );
  }

  return {
    nodes: orderedIds.map((conceptId) => ({
      id: conceptId,
      conceptId,
      title: conceptById.get(conceptId).name,
      status: 'upcoming',
    })),
    edges: selectedEdges.map(({ from, to }) => ({ from, to })),
  };
};

export const advanceLearningSession = (session, nodeId) => {
  if (session.status !== 'active') {
    throw new LearningGraphError('Only an active learning session can advance.', 409, 'session_not_active');
  }

  if (!session.plan || session.plan.currentNodeId !== nodeId) {
    throw new LearningGraphError(
      'Only the current learning step can be marked as practiced.',
      409,
      'not_current_step'
    );
  }

  const currentNode = session.plan.nodes.find((node) => node.id === nodeId);
  if (!currentNode || currentNode.status !== 'upcoming') {
    throw new LearningGraphError('The current learning step is invalid.', 409, 'invalid_session_plan');
  }

  const nodes = session.plan.nodes.map((node) =>
    node.id === nodeId ? { ...node, status: 'completed' } : { ...node }
  );
  const nextNode = nodes.find((node) => node.status === 'upcoming');

  return {
    status: nextNode ? 'active' : 'completed',
    plan: {
      ...session.plan,
      nodes,
      currentNodeId: nextNode?.id || null,
    },
  };
};
