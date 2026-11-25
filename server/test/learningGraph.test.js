import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import {
  advanceLearningSession,
  buildLearningPlan,
  LearningGraphError,
  validateRelationship,
} from '../services/learningGraphService.js';

describe('learning graph service', () => {
  test('builds a prerequisite-first path and skips demonstrated prerequisites', () => {
    const graph = {
      concepts: [
        { conceptId: 'basics', name: 'Basics', assessment: { status: 'demonstrated' } },
        { conceptId: 'functions', name: 'Functions', assessment: { status: 'developing' } },
        { conceptId: 'recursion', name: 'Recursion', assessment: { status: 'unknown' } },
        { conceptId: 'sorting', name: 'Sorting', assessment: { status: 'unknown' } },
      ],
      relationships: [
        { from: 'basics', to: 'functions', type: 'prerequisite' },
        { from: 'functions', to: 'recursion', type: 'prerequisite' },
      ],
    };

    const plan = buildLearningPlan(graph, 'recursion');

    assert.deepEqual(plan.nodes.map((node) => node.id), ['functions', 'recursion']);
    assert.deepEqual(plan.edges, [{ from: 'functions', to: 'recursion' }]);
  });

  test('rejects prerequisite cycles and duplicate relationships', () => {
    const graph = {
      concepts: [
        { conceptId: 'a', name: 'A' },
        { conceptId: 'b', name: 'B' },
      ],
      relationships: [{ from: 'a', to: 'b', type: 'prerequisite' }],
    };

    assert.throws(
      () => validateRelationship(graph, { from: 'b', to: 'a', type: 'prerequisite' }),
      (error) => error instanceof LearningGraphError && error.code === 'prerequisite_cycle'
    );
    assert.throws(
      () => validateRelationship(graph, { from: 'a', to: 'b', type: 'prerequisite' }),
      (error) => error instanceof LearningGraphError && error.code === 'relationship_exists'
    );

    const relatedGraph = {
      ...graph,
      relationships: [{ from: 'a', to: 'b', type: 'related' }],
    };
    assert.throws(
      () => validateRelationship(relatedGraph, { from: 'b', to: 'a', type: 'related' }),
      (error) => error instanceof LearningGraphError && error.code === 'relationship_exists'
    );
  });

  test('advances only the current step and completes the session after the final step', () => {
    const session = {
      status: 'active',
      plan: {
        currentNodeId: 'functions',
        nodes: [
          { id: 'functions', status: 'upcoming' },
          { id: 'recursion', status: 'upcoming' },
        ],
        edges: [{ from: 'functions', to: 'recursion' }],
      },
    };

    assert.throws(
      () => advanceLearningSession(session, 'recursion'),
      (error) => error instanceof LearningGraphError && error.code === 'not_current_step'
    );

    const next = advanceLearningSession(session, 'functions');
    assert.equal(next.status, 'active');
    assert.equal(next.plan.currentNodeId, 'recursion');
    assert.equal(next.plan.nodes[0].status, 'completed');

    const complete = advanceLearningSession(
      { ...session, status: next.status, plan: next.plan },
      'recursion'
    );
    assert.equal(complete.status, 'completed');
    assert.equal(complete.plan.currentNodeId, null);
  });
});
