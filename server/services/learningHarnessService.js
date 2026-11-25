import fs from 'fs';
import path from 'path';
import { callLLM } from './llmService.js';

const KNOWLEDGE_GRAPH_FILENAME = 'knowledge-graph.md';

const shouldUseLLM = () => process.env.NODE_ENV !== 'test' && Boolean(process.env.LLM_API_KEY);

/**
 * Resolves the path to knowledge-graph.md
 */
export const getKnowledgeGraphPath = (customPath) => {
  if (customPath) return customPath;
  const cwdPath = path.resolve(process.cwd(), KNOWLEDGE_GRAPH_FILENAME);
  const parentPath = path.resolve(process.cwd(), '..', KNOWLEDGE_GRAPH_FILENAME);
  if (fs.existsSync(cwdPath)) return cwdPath;
  if (fs.existsSync(parentPath)) return parentPath;
  return cwdPath;
};

/**
 * Parses knowledge-graph.md into structured propositions and chains
 */
export const parseKnowledgeGraph = (content) => {
  const propositions = [];
  const chains = [];

  if (!content || typeof content !== 'string') {
    return { propositions, chains };
  }

  const lines = content.split('\n');
  let currentSection = '';

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    if (line.startsWith('## Propositions')) {
      currentSection = 'propositions';
      continue;
    } else if (line.startsWith('## Chains')) {
      currentSection = 'chains';
      continue;
    } else if (line.startsWith('#')) {
      currentSection = '';
      continue;
    }

    if (currentSection === 'propositions') {
      // Matches: - [solid] [topic: recursion] Proposition text: ...
      // or: - [shaky] [topic: ...] ...
      const propMatch = line.match(/^[-*]\s*\[(solid|shaky|weak)\]\s*(?:\[topic:\s*([^\]]+)\])?\s*(?:Proposition text:\s*)?(.+)$/i);
      if (propMatch) {
        propositions.push({
          status: propMatch[1].toLowerCase(),
          topic: (propMatch[2] || 'general').trim(),
          claim: propMatch[3].trim(),
        });
      }
    } else if (currentSection === 'chains') {
      // Matches: - Node A + Node B -> Node C
      const chainMatch = line.match(/^[-*]\s*(.+)\s*->\s*(.+)$/);
      if (chainMatch) {
        const premises = chainMatch[1].split('+').map((p) => p.trim()).filter(Boolean);
        const conclusion = chainMatch[2].trim();
        chains.push({ premises, conclusion });
      }
    }
  }

  return { propositions, chains };
};

/**
 * Serializes propositions and chains into knowledge-graph.md markdown format
 */
export const serializeKnowledgeGraph = ({ propositions = [], chains = [] }) => {
  let md = '# Clario Knowledge Graph\n\n## Propositions\n';

  if (propositions.length === 0) {
    md += '<!-- No propositions recorded yet -->\n';
  } else {
    for (const p of propositions) {
      const status = p.status || 'shaky';
      const topic = p.topic || 'general';
      md += `- [${status}] [topic: ${topic}] ${p.claim}\n`;
    }
  }

  md += '\n## Chains\n';
  if (chains.length === 0) {
    md += '<!-- No chains recorded yet -->\n';
  } else {
    for (const c of chains) {
      const premises = Array.isArray(c.premises) ? c.premises.join(' + ') : String(c.premises);
      md += `- ${premises} -> ${c.conclusion}\n`;
    }
  }

  return md;
};

/**
 * Reads knowledge-graph.md from disk (or creates if absent)
 */
export const readKnowledgeGraph = (customPath) => {
  const filePath = getKnowledgeGraphPath(customPath);
  try {
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf-8');
      return { ...parseKnowledgeGraph(content), filename: KNOWLEDGE_GRAPH_FILENAME, exists: true };
    }
  } catch (err) {
    console.warn(`[KnowledgeGraph] Could not read ${filePath}:`, err.message);
  }

  // Return empty structure if absent
  return { propositions: [], chains: [], filename: KNOWLEDGE_GRAPH_FILENAME, exists: false };
};

/**
 * Writes or updates knowledge-graph.md on disk
 */
export const writeKnowledgeGraph = (graph, customPath) => {
  const filePath = getKnowledgeGraphPath(customPath);
  const md = serializeKnowledgeGraph(graph);
  fs.writeFileSync(filePath, md, 'utf-8');
  return { ...graph, filePath, exists: true };
};

/**
 * Updates or merges propositions in the knowledge graph
 */
export const updateKnowledgeGraphPropositions = (newOrUpdated = [], newChains = [], customPath) => {
  const current = readKnowledgeGraph(customPath);
  const propMap = new Map();

  for (const p of current.propositions) {
    propMap.set(p.claim.toLowerCase(), p);
  }

  for (const p of newOrUpdated) {
    if (!p.claim) continue;
    propMap.set(p.claim.toLowerCase(), {
      status: p.status || 'shaky',
      topic: p.topic || 'general',
      claim: p.claim,
    });
  }

  const updatedPropositions = Array.from(propMap.values());
  const updatedChains = [...current.chains];

  for (const nc of newChains) {
    const exists = updatedChains.some(
      (c) =>
        c.conclusion === nc.conclusion &&
        JSON.stringify(c.premises) === JSON.stringify(nc.premises)
    );
    if (!exists) {
      updatedChains.push(nc);
    }
  }

  return writeKnowledgeGraph(
    { propositions: updatedPropositions, chains: updatedChains },
    customPath
  );
};

/**
 * Domain-adaptive fallback probes when LLM is unavailable or times out
 */
export const buildDomainFallbackProbes = (goal) => {
  const g = (goal || '').toLowerCase();

  if (
    g.includes('cpu') ||
    g.includes('ram') ||
    g.includes('memory') ||
    g.includes('hardware') ||
    g.includes('register') ||
    g.includes('cache') ||
    g.includes('storage') ||
    g.includes('bus')
  ) {
    return [
      {
        probeIndex: 1,
        totalProbes: 3,
        concept: 'Processing vs Temporary Storage',
        question: 'While a computer runs an application, which hardware component is actively executing arithmetic operations and instructions?',
        options: [
          'A) RAM',
          'B) CPU',
          'C) Solid State Drive (SSD)',
          "D) I don't know",
        ],
        correctOption: 'B',
        probeReasoning: 'Tests prerequisite understanding that the CPU computes while RAM holds volatile working data.',
      },
      {
        probeIndex: 2,
        totalProbes: 3,
        concept: 'Active Workspace & Volatility',
        question: 'If power is abruptly cut to a computer, what happens to unsaved data residing in RAM?',
        options: [
          'A) It is lost immediately because RAM is volatile memory',
          'B) It persists indefinitely until manually deleted',
          'C) It is automatically copied into CPU registers permanently',
          "D) I don't know",
        ],
        correctOption: 'A',
        probeReasoning: 'Tests prerequisite understanding of volatile working memory vs non-volatile storage.',
      },
      {
        probeIndex: 3,
        totalProbes: 3,
        concept: 'Memory Hierarchy & Access Latency',
        question: 'Why does a CPU fetch active program instructions from RAM rather than reading exclusively from a hard drive or SSD?',
        options: [
          'A) RAM provides vastly lower access latency and higher throughput to keep the CPU fed',
          'B) Disks cannot physically store binary machine instructions',
          'C) The CPU can only read data when an active internet connection is present',
          "D) I don't know",
        ],
        correctOption: 'A',
        probeReasoning: 'Tests prerequisite understanding of memory hierarchy and latency bottlenecks.',
      },
    ];
  }

  // Default algorithmic / systems fallback
  return [
    {
      probeIndex: 1,
      totalProbes: 3,
      concept: `${goal} - State Invariants & Boundaries`,
      question: `Before processing steps in ${goal}, what condition must hold regarding input boundaries and execution state?`,
      options: [
        'A) Inputs must satisfy defined invariants or edge constraints before state transitions',
        'B) Inputs are automatically replaced with random default values by the runtime',
        'C) Execution runs backwards if invalid arguments are supplied',
        "D) I don't know",
      ],
      correctOption: 'A',
      probeReasoning: 'Tests prerequisite understanding of preconditions and boundary constraints.',
    },
    {
      probeIndex: 2,
      totalProbes: 3,
      concept: `${goal} - Execution Scope & Scaffolding`,
      question: 'When an operation or subroutine is invoked, how are local variables and intermediate evaluation results isolated?',
      options: [
        'A) All variables overwrite global registry values directly',
        'B) A stack frame or lexical scope isolates variables until completion',
        'C) Variables are dispatched across a separate network thread',
        "D) I don't know",
      ],
      correctOption: 'B',
      probeReasoning: 'Tests prerequisite understanding of lexical/stack scoping.',
    },
    {
      probeIndex: 3,
      totalProbes: 3,
      concept: `${goal} - Deterministic Termination`,
      question: 'What guarantees that a computational sequence or repetition reaches completion without hanging?',
      options: [
        'A) Execution reaches a verified base condition where no further recursive invocation or loop iteration occurs',
        'B) The operating system forcibly kills all processes after 5 seconds',
        'C) Variables automatically wrap around to negative numbers',
        "D) I don't know",
      ],
      correctOption: 'A',
      probeReasoning: 'Tests prerequisite understanding of base conditions and termination.',
    },
  ];
};

/**
 * Generates 3-5 prerequisite probes for a learning goal
 */
export const generatePrerequisiteProbes = async (goal, existingGraph = { propositions: [] }) => {
  const solidItems = existingGraph.propositions
    .filter((p) => p.status === 'solid')
    .map((p) => p.claim);

  const fallbackProbes = buildDomainFallbackProbes(goal);

  if (!shouldUseLLM()) {
    return fallbackProbes;
  }

  try {
    const systemPrompt = `You are Clario, a cognitive tutor.
Your goal is to MEASURE the learner's prerequisite understanding for a topic.
Generate exactly 3 to 4 diagnostic questions targeting prerequisites that the goal DEPENDS ON, NOT the goal itself.
Every probe must test a prediction or small reasoning task (never "do you know about X?").
${solidItems.length > 0 ? `The learner already understands these SOLID prerequisites, so SKIP probing them:\n- ${solidItems.join('\n- ')}` : ''}

Output ONLY valid JSON in this exact structure:
[
  {
    "probeIndex": 1,
    "concept": "Prerequisite Concept Name",
    "question": "Prediction or reasoning task question?",
    "options": [
      "A) ...",
      "B) ...",
      "C) ...",
      "D) I don't know"
    ],
    "correctOption": "B",
    "probeReasoning": "Why this question tests prerequisite understanding"
  }
]`;

    const userPrompt = `Learning Goal: "${goal}"\nGenerate the diagnostic prerequisite probes.`;
    const response = await callLLM(systemPrompt, userPrompt, 1500, 45000);
    if (response) {
      const match = response.match(/\[\s*\{[\s\S]*\}\s*\]/);
      if (match) {
        const parsed = JSON.parse(match[0]);
        if (Array.isArray(parsed) && parsed.length >= 2) {
          const total = parsed.length;
          return parsed.slice(0, 5).map((p, idx) => ({
            probeIndex: idx + 1,
            totalProbes: total,
            concept: p.concept || `Prerequisite ${idx + 1}`,
            question: p.question,
            options: Array.isArray(p.options) && p.options.length >= 4 ? p.options : fallbackProbes[0].options,
            correctOption: p.correctOption || 'A',
            probeReasoning: p.probeReasoning || 'Evaluates prerequisite reasoning.',
          }));
        }
      }
    }
  } catch (err) {
    console.warn('[Harness] LLM probe generation fell back:', err.message);
  }

  return fallbackProbes;
};

/**
 * Scores a single probe response based on answer and the required thinking field
 */
export const scoreProbeResponse = async ({
  question,
  options,
  correctOption,
  selectedOption,
  confidence,
  thinking,
}) => {
  const isIdk = selectedOption?.trim().toUpperCase().startsWith('D') || selectedOption?.toLowerCase().includes("don't know");
  const isOptionLetterMatch = selectedOption?.trim().toUpperCase().startsWith(correctOption?.trim().toUpperCase());

  // Default deterministic evaluation
  let score = 'wrong';
  if (isIdk) {
    score = 'unknown';
  } else if (isOptionLetterMatch) {
    score = 'correct';
  }

  let reasoningModel = `Selected ${selectedOption || 'none'} with ${confidence}% confidence: "${thinking || 'No reasoning provided'}"`;

  if (!shouldUseLLM()) {
    if (score === 'correct' && (!thinking || thinking.length < 5)) {
      score = 'partially correct';
      reasoningModel = 'Correct option picked but minimal reasoning provided.';
    }
    return { score, reasoningModel };
  }

  try {
    const systemPrompt = `You are Clario, an expert tutor evaluating a learner's prerequisite probe response.
You must grade their understanding based on BOTH their selected option AND their reasoning ("YOUR THINKING").
The thinking field matters MORE than the option — it reveals HOW they reason.

Score must be one of: "correct" | "partially correct" | "wrong" | "unknown"
Also produce a concise one-line model of their reasoning (e.g. "Recognizes stack allocation but conflates heap pointers with registers").

Output ONLY valid JSON:
{
  "score": "correct|partially correct|wrong|unknown",
  "reasoningModel": "One-line summary of how they reason"
}`;

    const userPrompt = `Question: "${question}"
Options: ${JSON.stringify(options)}
Expected Correct Option: "${correctOption}"
Learner Selected Option: "${selectedOption}"
Confidence: ${confidence}%
Learner Thinking: "${thinking}"`;

    const response = await callLLM(systemPrompt, userPrompt, 500, 35000);
    if (response) {
      const match = response.match(/\{[\s\S]*\}/);
      if (match) {
        const parsed = JSON.parse(match[0]);
        if (parsed.score && parsed.reasoningModel) {
          return {
            score: parsed.score,
            reasoningModel: parsed.reasoningModel,
          };
        }
      }
    }
  } catch (err) {
    console.warn('[Harness] LLM probe evaluation fell back:', err.message);
  }

  // Refine fallback if thinking is insightful
  if (score === 'correct' && (!thinking || thinking.length < 5)) {
    score = 'partially correct';
    reasoningModel = 'Correct option picked but minimal reasoning provided.';
  }

  return { score, reasoningModel };
};

/**
 * Builds the Lesson Map: minimal dependency tree
 */
export const buildLessonMap = async (goal, probeResults = []) => {
  // Determine understood vs to teach
  const understoodNodes = [];
  const toTeachNodes = [];

  for (const r of probeResults) {
    if (r.score === 'correct') {
      understoodNodes.push(r.concept || 'Prerequisite fundamental');
    } else {
      toTeachNodes.push(r.concept || 'Prerequisite step');
    }
  }

  // Fallback default nodes if none extracted
  if (understoodNodes.length === 0 && toTeachNodes.length === 0) {
    understoodNodes.push('Execution flow & basic functions');
    toTeachNodes.push('Stack frame invocation & parameter binding');
    toTeachNodes.push('Base condition & termination guard');
  } else if (toTeachNodes.length === 0) {
    toTeachNodes.push(`Core mechanics of ${goal}`);
  }

  // Generate ASCII tree
  let asciiTree = 'LESSON MAP\n';
  for (const u of understoodNodes) {
    asciiTree += `[x] ${u}\n`;
  }
  for (let i = 0; i < toTeachNodes.length; i++) {
    const node = toTeachNodes[i];
    asciiTree += `[ ] ${node}\n`;
    if (i > 0) {
      asciiTree += `    └─ depends on ${toTeachNodes[i - 1]}\n`;
    }
  }
  asciiTree += `GOAL: ${goal}  ← top of the tree`;

  let explanation = `We will start from what you already understand (${understoodNodes.join(', ') || 'fundamental state'}), address ${toTeachNodes.join(' then ')}, and build directly to ${goal}. Each node is one small reasoning step that feels obvious once understood.`;

  const fallbackNodes = [
    ...understoodNodes.map((u, i) => ({ id: `node-u-${i}`, name: u, status: 'understood', dependsOn: null })),
    ...toTeachNodes.map((t, i) => ({
      id: `node-t-${i}`,
      name: t,
      status: 'to_teach',
      dependsOn: i > 0 ? `node-t-${i - 1}` : (understoodNodes[0] ? 'node-u-0' : null),
    })),
    { id: 'node-goal', name: goal, status: 'goal', dependsOn: toTeachNodes.length > 0 ? `node-t-${toTeachNodes.length - 1}` : null },
  ];

  if (!shouldUseLLM()) {
    return { asciiTree, nodes: fallbackNodes, explanation };
  }

  try {
    const systemPrompt = `You are Clario, a cognitive tutor creating a minimal dependency tree LESSON MAP.
Each node = ONE reasoning step, small enough to feel obvious once understood.
Use this exact ASCII format:
LESSON MAP
[x] Node they already understand
[ ] Node to teach
[ ] Node to teach
    └─ depends on the node above
GOAL: [their goal]  ← top of the tree

Also provide a 2-3 sentence explanation of the plan.

Output ONLY valid JSON:
{
  "asciiTree": "LESSON MAP\\n...",
  "nodes": [
    { "id": "slug", "name": "Node Name", "status": "understood|to_teach", "dependsOn": "parent_slug_or_null" }
  ],
  "explanation": "2-3 sentences explaining the plan."
}`;

    const userPrompt = `Goal: "${goal}"\nProbe Evaluation Results:\n${JSON.stringify(probeResults, null, 2)}`;
    const response = await callLLM(systemPrompt, userPrompt, 1000, 45000);
    if (response) {
      const match = response.match(/\{[\s\S]*\}/);
      if (match) {
        const parsed = JSON.parse(match[0]);
        if (parsed.asciiTree && parsed.explanation) {
          return {
            asciiTree: parsed.asciiTree,
            nodes: parsed.nodes || [],
            explanation: parsed.explanation,
          };
        }
      }
    }
  } catch (err) {
    console.warn('[Harness] LLM lesson map generation fell back:', err.message);
  }

  const nodes = [
    ...understoodNodes.map((u, i) => ({ id: `node-u-${i}`, name: u, status: 'understood', dependsOn: null })),
    ...toTeachNodes.map((t, i) => ({
      id: `node-t-${i}`,
      name: t,
      status: 'to_teach',
      dependsOn: i > 0 ? `node-t-${i - 1}` : (understoodNodes[0] ? 'node-u-0' : null),
    })),
    { id: 'node-goal', name: goal, status: 'goal', dependsOn: toTeachNodes.length > 0 ? `node-t-${toTeachNodes.length - 1}` : null },
  ];

  return { asciiTree, nodes, explanation };
};

/**
 * Generates a PREDICT question for a specific node in the lesson map
 */
export const generatePredictQuestion = async (nodeName, goal, previousNodeName = null) => {
  const fallback = {
    nodeName,
    question: `Before we formalize ${nodeName}: Suppose a function executing ${goal} encounters this step. What must hold true about the data state immediately before proceeding?`,
    options: [
      'A) State is restored from disk automatically',
      'B) The input values must satisfy the step precondition or the operation is invalid',
      'C) The step ignores all earlier parameters and starts fresh',
      "D) I don't know",
    ],
    correctOption: 'B',
    conceptClaim: `${nodeName} enforces valid preconditions before execution transitions.`,
  };

  if (!shouldUseLLM()) {
    return fallback;
  }

  try {
    const systemPrompt = `You are Clario, walking the lesson map.
For the node "${nodeName}", pose a PREDICT question (NEVER explain first).
Format must include 4 options with "D) I don't know".
Also include the proposition/conceptClaim (one concise claim, e.g. "An unbiased estimator's expectation equals the true parameter").

Output ONLY valid JSON:
{
  "nodeName": "${nodeName}",
  "question": "Prediction question?",
  "options": [
    "A) ...",
    "B) ...",
    "C) ...",
    "D) I don't know"
  ],
  "correctOption": "B",
  "conceptClaim": "One proposition claim for this node"
}`;

    const userPrompt = `Goal: "${goal}"\nCurrent node to teach: "${nodeName}"\nPrevious node: "${previousNodeName || 'prerequisites'}"`;
    const response = await callLLM(systemPrompt, userPrompt, 800, 40000);
    if (response) {
      const match = response.match(/\{[\s\S]*\}/);
      if (match) {
        const parsed = JSON.parse(match[0]);
        if (parsed.question && Array.isArray(parsed.options)) {
          return parsed;
        }
      }
    }
  } catch (err) {
    console.warn('[Harness] Predict question generation fell back:', err.message);
  }

  return fallback;
};

/**
 * Evaluates a PREDICT answer and determines teaching action:
 * - sound reasoning -> 2-4 sentence explanation linking to previous node, mark [x], move on
 * - wrong/partial attempt 1 -> REPAIR: name specific misconception, explain only that, re-pose variant
 * - wrong attempt 2 -> explain fully, mark [!] (shaky), move on
 * - correct but low confidence (< 40%) -> check "why must this be true?"
 */
export const evaluatePredictResponse = async ({
  nodeName,
  previousNodeName,
  question,
  options,
  correctOption,
  selectedOption,
  confidence,
  thinking,
  attemptNumber = 1,
  conceptClaim = '',
}) => {
  const isIdk = selectedOption?.trim().toUpperCase().startsWith('D') || selectedOption?.toLowerCase().includes("don't know");
  const isOptionLetterMatch = selectedOption?.trim().toUpperCase().startsWith(correctOption?.trim().toUpperCase());
  const confNumber = Number(confidence) || 50;

  const computeDeterministicPredict = () => {
    if (isOptionLetterMatch && !isIdk) {
      if (confNumber < 40) {
        return {
          action: 'verify_intuition',
          nodeStatus: 'shaky',
          explanation: 'Your answer is correct, but confidence is low. Before moving on, why must this be true?',
        };
      }
      return {
        action: 'advance',
        nodeStatus: 'solid',
        explanation: `Correct. In ${nodeName}, building from ${previousNodeName || 'our prerequisite foundations'}, state transitions preserve invariant guarantees. Mark [x].`,
      };
    }

    if (attemptNumber >= 2) {
      return {
        action: 'force_advance',
        nodeStatus: 'shaky',
        explanation: `Here is the full explanation: ${conceptClaim || nodeName} ensures execution transitions cleanly. We mark this node [!] (shaky — needs practice) and move forward. A wrong answer must not hold you in place.`,
      };
    }

    return {
      action: 'repair',
      nodeStatus: 'shaky',
      misconception: 'Assuming unconstrained state mutation without invariant checks',
      explanation: `Notice: In ${nodeName}, variables do not mutate arbitrarily. The scope specifically preserves the prior state. Let's try this variant:`,
      variantQuestion: {
        question: `If ${nodeName} receives an unexpected null pointer, what is the guaranteed recovery mechanism?`,
        options: [
          'A) It throws or halts explicitly at the guard condition',
          'B) It rewrites the operating system page table',
          'C) It ignores the error and returns undefined',
          "D) I don't know",
        ],
        correctOption: 'A',
      },
    };
  };

  if (!shouldUseLLM()) {
    return computeDeterministicPredict();
  }

  try {
    const systemPrompt = `You are Clario, an adaptive tutor.
Evaluate the learner's response to the prediction question on node "${nodeName}".
Previous node: "${previousNodeName || 'prerequisites'}".
Attempt number: ${attemptNumber}.

Rules:
1. Correct with sound reasoning:
   - action: "advance"
   - explanation: 2-4 sentences linking it to "${previousNodeName || 'previous foundations'}".
   - nodeStatus: "solid"
2. Correct but low confidence (< 40%):
   - action: "verify_intuition"
   - promptText: Ask: "Why must this be true?" to ensure it feels obviously true, not merely familiar.
3. Wrong/partial on Attempt 1:
   - action: "repair"
   - name the SPECIFIC misconception revealed by their thinking.
   - explain ONLY that misconception in 2-3 sentences.
   - pose a fresh variant question with options A, B, C, D (I don't know).
4. Wrong on Attempt 2 (or second failure):
   - action: "force_advance"
   - explain the node fully in 2-4 clear sentences.
   - nodeStatus: "shaky"
   - note: "Marking [!] (shaky — needs practice) and moving on. A wrong answer must not hold you in place."

Output ONLY valid JSON:
{
  "action": "advance|repair|force_advance|verify_intuition",
  "nodeStatus": "solid|shaky|weak",
  "explanation": "Explanation text or repair explanation",
  "misconception": "Name of misconception if repair, or empty string",
  "variantQuestion": {
    "question": "Variant prediction question if repair",
    "options": ["A) ...", "B) ...", "C) ...", "D) I don't know"],
    "correctOption": "B"
  }
}`;

    const userPrompt = `Node: "${nodeName}"
Question: "${question}"
Correct Option: "${correctOption}"
Learner Option: "${selectedOption}"
Confidence: ${confNumber}%
Learner Thinking: "${thinking}"
Attempt: ${attemptNumber}`;

    const response = await callLLM(systemPrompt, userPrompt, 1000, 45000);
    if (response) {
      const match = response.match(/\{[\s\S]*\}/);
      if (match) {
        const parsed = JSON.parse(match[0]);
        if (parsed.action) {
          return parsed;
        }
      }
    }
  } catch (err) {
    console.warn('[Harness] Predict evaluation fell back:', err.message);
  }

  return computeDeterministicPredict();
};

/**
 * Generates 3-5 practice problems after reaching the goal
 * - Requires knowledge to come to mind WITHOUT being named
 * - Weighted toward [!] shaky nodes and high-confidence-wrong moments
 */
export const generatePracticeProblems = async (goal, taughtNodes = [], shakyNodes = []) => {
  const fallback = [
    {
      problemIndex: 1,
      totalProblems: 3,
      prompt: `A system processes 10,000 recursive calculations per second. Suddenly, requests with depth > 500 crash with a stack overflow error, but depth <= 500 succeed cleanly. What architectural adjustment restores stability without changing algorithmic results?`,
      targetConcept: 'Stack frame limits and tail-call / iteration conversion',
      isTargetShaky: true,
    },
    {
      problemIndex: 2,
      totalProblems: 3,
      prompt: `You are debugging an algorithm where a subtree returns an inconsistent count when two threads read concurrently. Identify the root concurrency race condition in the invariant check.`,
      targetConcept: 'State invariant synchronization',
      isTargetShaky: false,
    },
    {
      problemIndex: 3,
      totalProblems: 3,
      prompt: `Given an input dataset that is already sorted in reverse order, predict the exact call graph branching factor and how to avoid quadratic worst-case behavior.`,
      targetConcept: 'Worst-case branch recursion',
      isTargetShaky: true,
    },
  ];

  if (!shouldUseLLM()) {
    return fallback;
  }

  try {
    const systemPrompt = `You are Clario, generating PRACTICE problems.
Rules:
- Generate 3 to 4 scenario-based practice problems.
- Require the knowledge to come to mind WITHOUT being named (NO "using the formula we just learned...").
- Weight toward [!] shaky nodes: ${JSON.stringify(shakyNodes)}.
- Taught nodes: ${JSON.stringify(taughtNodes.map((n) => n.name))}.

Output ONLY valid JSON:
[
  {
    "problemIndex": 1,
    "prompt": "Scenario problem text without naming concept directly...",
    "targetConcept": "Concept being tested",
    "isTargetShaky": true
  }
]`;

    const userPrompt = `Goal: "${goal}"\nGenerate practice problems.`;
    const response = await callLLM(systemPrompt, userPrompt, 1200, 45000);
    if (response) {
      const match = response.match(/\[\s*\{[\s\S]*\}\s*\]/);
      if (match) {
        const parsed = JSON.parse(match[0]);
        if (Array.isArray(parsed) && parsed.length >= 2) {
          const total = parsed.length;
          return parsed.map((p, idx) => ({
            problemIndex: idx + 1,
            totalProblems: total,
            prompt: p.prompt,
            targetConcept: p.targetConcept || goal,
            isTargetShaky: Boolean(p.isTargetShaky),
          }));
        }
      }
    }
  } catch (err) {
    console.warn('[Harness] Practice problem generation fell back:', err.message);
  }

  return fallback;
};

/**
 * Grades a practice problem reasoning response and produces 3-line summary at the end
 */
export const gradePracticeResponse = async ({
  problemPrompt,
  targetConcept,
  learnerResponse,
  problemIndex,
  totalProblems,
  cumulativeResults = [],
}) => {
  let isSound = (learnerResponse || '').length > 20;
  let feedback = `Your reasoning addresses the core scenario by analyzing state behavior directly.`;

  if (shouldUseLLM()) {
    try {
      const systemPrompt = `You are Clario, grading a practice problem.
Grade the REASONING, not keywords.
Is their explanation sound? Give a direct, concise evaluation (2-3 sentences). Praise reasoning, not superficial outcomes.

Output ONLY valid JSON:
{
  "isSound": true|false,
  "feedback": "Concise direct evaluation of reasoning"
}`;

    const userPrompt = `Problem: "${problemPrompt}"
Target Concept: "${targetConcept}"
Learner Reasoning: "${learnerResponse}"`;

    const response = await callLLM(systemPrompt, userPrompt, 500, 35000);
    if (response) {
      const match = response.match(/\{[\s\S]*\}/);
      if (match) {
        const parsed = JSON.parse(match[0]);
        if (typeof parsed.isSound === 'boolean') {
          isSound = parsed.isSound;
          feedback = parsed.feedback;
        }
      }
    }
  } catch (err) {
    console.warn('[Harness] Practice grading fell back:', err.message);
  }
}

  const isFinalProblem = problemIndex >= totalProblems;
  let summary = null;

  if (isFinalProblem) {
    const allResults = [...cumulativeResults, { targetConcept, isSound, learnerResponse }];
    const solid = allResults.filter((r) => r.isSound).map((r) => r.targetConcept);
    const shaky = allResults.filter((r) => !r.isSound).map((r) => r.targetConcept);

    summary = {
      solid: solid.length > 0 ? solid.join(', ') : 'Prerequisite fundamentals',
      shaky: shaky.length > 0 ? shaky.join(', ') : 'None — solid across all practice scenarios',
      revisitWhen: `When designing high-throughput or deep recursive systems under memory constraints`,
    };
  }

  return { isSound, feedback, isFinalProblem, summary };
};
