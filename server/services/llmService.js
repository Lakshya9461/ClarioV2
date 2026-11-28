// LLM Service for Prompt Refinement, Structured Answer Generation, and Streaming
// Supports both OpenAI-compatible (/v1/chat/completions) and Anthropic-compatible (/v1/messages) endpoints
import { detectAndGenerateVisualizationTrace } from './visualizerService.js';

/**
 * Validates and sanitizes chartData structure
 */
export const sanitizeChartData = (chartData) => {
  if (!chartData || typeof chartData !== 'object') {
    return null;
  }

  const { type, labels, values, title, datasetLabel } = chartData;

  const validTypes = ['bar', 'line', 'pie', 'doughnut', 'radar', 'polarArea'];
  const sanitizedType = validTypes.includes(type) ? type : 'bar';

  if (!Array.isArray(labels) || !Array.isArray(values) || labels.length === 0 || values.length === 0) {
    return null;
  }

  const numericValues = values.slice(0, labels.length).map((v) => {
    const num = Number(v);
    return isNaN(num) ? 0 : num;
  });

  const stringLabels = labels.slice(0, numericValues.length).map((l) => String(l));

  return {
    type: sanitizedType,
    title: title ? String(title) : 'Comparative Data Analysis',
    labels: stringLabels,
    values: numericValues,
    datasetLabel: datasetLabel ? String(datasetLabel) : 'Metric',
  };
};

/**
 * Validates and sanitizes dynamic AI slides structure
 */
export const sanitizeSlides = (slides, rawQuestion = '') => {
  if (!Array.isArray(slides) || slides.length === 0) {
    return [];
  }

  return slides.slice(0, 7).map((slide, index) => {
    return {
      slideNumber: slide.slideNumber || index + 1,
      title: slide.title ? String(slide.title) : `Slide ${index + 1}`,
      subtitle: slide.subtitle ? String(slide.subtitle) : '',
      layout: ['hero', 'process', 'deep_dive', 'chart', 'takeaways', 'comparison'].includes(slide.layout)
        ? slide.layout
        : 'deep_dive',
      badge: slide.badge ? String(slide.badge) : '',
      keyConcept: slide.keyConcept ? String(slide.keyConcept) : '',
      bulletPoints: Array.isArray(slide.bulletPoints)
        ? slide.bulletPoints.map((bp) => ({
            heading: bp.heading ? String(bp.heading) : '',
            description: bp.description ? String(bp.description) : '',
            tag: bp.tag ? String(bp.tag) : '',
          }))
        : [],
      processSteps: Array.isArray(slide.processSteps)
        ? slide.processSteps.map((s) => String(s))
        : [],
      codeOrFormula: slide.codeOrFormula ? String(slide.codeOrFormula) : null,
      callout: slide.callout && typeof slide.callout === 'object'
        ? {
            title: slide.callout.title ? String(slide.callout.title) : 'Key Insight',
            description: slide.callout.description ? String(slide.callout.description) : '',
            type: ['insight', 'warning', 'tip'].includes(slide.callout.type) ? slide.callout.type : 'insight',
          }
        : null,
    };
  });
};

/**
 * Validates and sanitizes 3-5 search keywords for video search
 */
export const sanitizeSearchKeywords = (keywords, fallbackTopic = '') => {
  if (Array.isArray(keywords) && keywords.length > 0) {
    const cleaned = keywords
      .map((k) => (typeof k === 'string' ? k.trim().replace(/^["']|["']$/g, '') : ''))
      .filter((k) => k.length >= 2)
      .slice(0, 5);
    if (cleaned.length >= 2) {
      return cleaned;
    }
  }

  // Fallback to topic extraction
  if (fallbackTopic) {
    const clean = fallbackTopic.trim().replace(/[^a-zA-Z0-9\s]/g, ' ').replace(/\s+/g, ' ');
    if (clean.length > 2) {
      return [
        clean,
        `${clean} explained`,
        `${clean} tutorial`,
        `${clean} basics`,
      ].slice(0, 4);
    }
  }

  return ['computer science explained', 'programming concepts', 'software engineering tutorial'];
};

/**
 * Safely parse JSON from LLMs, handling raw control characters and unescaped newlines
 */
const parseLlmJson = (raw) => {
  let cleaned = raw.replace(/```(?:json)?/gi, '').replace(/```/g, '').trim();
  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1) {
    cleaned = cleaned.substring(firstBrace, lastBrace + 1);
  }

  try {
    return JSON.parse(cleaned);
  } catch (e) {
    let inString = false;
    let escaped = false;
    let fixed = '';
    for (let i = 0; i < cleaned.length; i++) {
      const c = cleaned[i];
      if (c === '"' && !escaped) {
        inString = !inString;
      }
      if (inString) {
        if (c === '\n') {
          fixed += '\\n';
        } else if (c === '\r') {
          // ignore
        } else if (c === '\t') {
          fixed += '\\t';
        } else {
          fixed += c;
        }
      } else {
        fixed += c;
      }
      escaped = c === '\\' && !escaped;
    }
    return JSON.parse(fixed);
  }
};

/**
 * Universal caller supporting OpenAI-compatible and Anthropic endpoints
 */
export const callLLM = async (systemPrompt, userPrompt, maxTokens = 2500, timeoutMs = 45000, customConfig = null) => {
  let apiUrl = process.env.LLM_API_URL || 'https://strata.lakshya9461.in/v1';
  let apiKey = process.env.LLM_API_KEY || '';
  let model = process.env.LLM_MODEL || 'qwen3.8-flash-next-gyro-gyro-m';
  let isAnthropic = false;

  // Diagnostic: log what model routing is selected
  console.log('[callLLM] routing:', JSON.stringify({
    customEnabled: customConfig?.enabled,
    customModel: customConfig?.model,
    customProvider: customConfig?.provider,
    hasKey: Boolean(customConfig?.apiKey),
  }));

  // Check if custom user-configured model is enabled and provided
  if (customConfig && customConfig.enabled && customConfig.model && customConfig.model.trim()) {
    const prov = (customConfig.provider || 'openai').toLowerCase();
    model = customConfig.model.trim();
    apiKey = customConfig.apiKey || '';

    if (prov === 'anthropic') {
      isAnthropic = true;
      apiUrl = customConfig.apiUrl?.trim() || 'https://api.anthropic.com/v1/messages';
    } else if (prov === 'gemini') {
      apiUrl = customConfig.apiUrl?.trim() || 'https://generativelanguage.googleapis.com/v1beta/openai';
    } else if (prov === 'groq') {
      apiUrl = customConfig.apiUrl?.trim() || 'https://api.groq.com/openai/v1';
    } else if (prov === 'deepseek') {
      apiUrl = customConfig.apiUrl?.trim() || 'https://api.deepseek.com/v1';
    } else if (prov === 'ollama') {
      apiUrl = customConfig.apiUrl?.trim() || 'http://localhost:11434/v1';
    } else {
      // openai or custom provider
      apiUrl = customConfig.apiUrl?.trim() || 'https://api.openai.com/v1';
    }
  } else {
    isAnthropic = apiUrl.endsWith('/messages');
  }

  let targetUrl = apiUrl;
  if (!isAnthropic && !targetUrl.endsWith('/chat/completions')) {
    targetUrl = targetUrl.replace(/\/+$/, '') + '/chat/completions';
  }

  const headers = {
    'Content-Type': 'application/json',
  };

  let body;
  if (isAnthropic) {
    if (apiKey) headers['x-api-key'] = apiKey;
    headers['anthropic-version'] = '2023-06-01';
    body = {
      model,
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    };
  } else {
    if (apiKey) {
      headers['Authorization'] = `Bearer ${apiKey}`;
      // Gemini's OpenAI endpoint supports both Authorization: Bearer and x-goog-api-key
      headers['x-goog-api-key'] = apiKey;
    }
    body = {
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: maxTokens,
      temperature: 0.7,
    };
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(targetUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      throw new Error(`LLM API returned ${response.status}: ${errText.slice(0, 200)}`);
    }

    const data = await response.json();
    return data?.choices?.[0]?.message?.content || data?.content?.[0]?.text || null;
  } catch (err) {
    clearTimeout(timeoutId);
    throw err;
  }
};

/**
 * Test connectivity and authentication for a user-configured model
 */
export const testModelConnection = async (config) => {
  if (!config || !config.model || !config.model.trim()) {
    throw new Error('Model identifier is required.');
  }

  const testConfig = { ...config, enabled: true };
  const startTime = Date.now();
  const testResponse = await callLLM(
    'You are a model verification probe. Respond with only the word OK.',
    'Ping.',
    20,
    10000,
    testConfig
  );
  const latencyMs = Date.now() - startTime;
  return {
    ok: true,
    model: config.model,
    provider: config.provider || 'openai',
    latencyMs,
    sampleResponse: (testResponse || 'OK').trim().slice(0, 80),
  };
};

/**
 * Subject Tag inference heuristic
 */
export const inferSubjectTag = (text) => {
  const t = (text || '').toLowerCase();
  if (t.match(/code|software|programming|python|algorithm|recursion|tree|graph|database|sql|react|node|javascript|cse|stack|heap|cpu|memory|network|security|crypto|os|compiler|search|sort|\bc\b/)) {
    return 'computer_science';
  }
  if (t.match(/math|calculus|algebra|matrix|probability|statistics|derivative|integral|differential|geometry|theorem|interest|formula/)) {
    return 'mathematics';
  }
  if (t.match(/physics|quantum|thermodynamics|mechanics|optics|gravity|electromagnetism|velocity|force|energy/)) {
    return 'physics';
  }
  if (t.match(/biology|photosynthesis|cell|dna|gene|evolution|organism|protein|enzyme|ecology/)) {
    return 'biology';
  }
  if (t.match(/chemistry|reaction|molecule|bond|acid|base|periodic|organic|inorganic/)) {
    return 'chemistry';
  }
  if (t.match(/economics|finance|gdp|inflation|market|capital|currency|banking/)) {
    return 'economics';
  }
  return 'general_engineering';
};

/**
 * Helper to parse clean subject from query string (removes question preamble)
 */
const extractCleanTopic = (query) => {
  return (query || '')
    .replace(/^(what is the difference between|what are the differences between|difference between|compare|which is better|which is|explain|what is|what are|how does|how do)\s+/i, '')
    .replace(/[?!.]+$/, '')
    .trim();
};

/**
 * Universal entity extraction for comparison queries
 * e.g., "which is better linux or windows" -> { entityA: "Linux", entityB: "Windows" }
 */
export const parseComparisonEntities = (text) => {
  if (!text || typeof text !== 'string') return null;
  const t = text.trim().replace(/[?!.]+$/, '');

  // "which is better X or Y" / "which is faster X or Y"
  const m1 = t.match(/which(?:\s+is)?(?:\s+(?:better|faster|preferable|superior))?\s+([a-zA-Z0-9#+.\s_-]+?)\s+or\s+([a-zA-Z0-9#+.\s_-]+)/i);
  if (m1 && m1[1] && m1[2]) {
    return { entityA: m1[1].trim(), entityB: m1[2].trim() };
  }

  // "difference between X and Y"
  const m2 = t.match(/difference\s+between\s+([a-zA-Z0-9#+.\s_-]+?)\s+and\s+([a-zA-Z0-9#+.\s_-]+)/i);
  if (m2 && m2[1] && m2[2]) {
    return { entityA: m2[1].trim(), entityB: m2[2].trim() };
  }

  // "compare X and Y" / "compare X vs Y" / "compare X with Y"
  const m3 = t.match(/compare\s+([a-zA-Z0-9#+.\s_-]+?)\s+(?:and|to|vs|versus|with)\s+([a-zA-Z0-9#+.\s_-]+)/i);
  if (m3 && m3[1] && m3[2]) {
    return { entityA: m3[1].trim(), entityB: m3[2].trim() };
  }

  // "X vs Y" / "X versus Y"
  const m4 = t.match(/^([a-zA-Z0-9#+.\s_-]+?)\s+(?:vs|versus)\s+([a-zA-Z0-9#+.\s_-]+)$/i);
  if (m4 && m4[1] && m4[2]) {
    return { entityA: m4[1].trim(), entityB: m4[2].trim() };
  }

  return null;
};

/**
 * Helper to detect greetings, pleasantries, and casual conversational remarks
 * These do NOT warrant a lecture-style PPT slide deck or chart!
 */
export const isGreetingOrCasual = (text) => {
  if (!text || typeof text !== 'string') return false;
  const cleaned = text
    .trim()
    .toLowerCase()
    .replace(/[!?.,;:'"()]/g, '')
    .trim();

  const exactGreetings = new Set([
    'hi',
    'hello',
    'hey',
    'heya',
    'hola',
    'yo',
    'sup',
    'howdy',
    'greetings',
    'good morning',
    'good afternoon',
    'good evening',
    'who are you',
    'what are you',
    'what can you do',
    'how are you',
    'how are you doing',
    'how r u',
    'help',
    'start',
    'ping',
    'test',
    'thanks',
    'thank you',
    'bye',
    'goodbye',
  ]);

  if (exactGreetings.has(cleaned)) return true;

  const words = cleaned.split(/\s+/);
  if (words.length <= 4 && ['hi', 'hello', 'hey', 'heya', 'hola'].includes(words[0])) {
    return true;
  }

  return false;
};

/**
 * Intelligent Knowledge Base with Comprehensive Technical Breakdowns & Dynamic Slide Decks
 */
const getKnowledgeBaseAnswer = (question) => {
  const q = question.toLowerCase();

  // 0. Greetings & Casual Inquiries (Do NOT generate PPT or Chart!)
  if (isGreetingOrCasual(question)) {
    return {
      refinedPrompt: 'User greeting & platform capabilities inquiry',
      explanation: `### Hello! 👋 Welcome to Clario

I am **Clario**, your AI Computer Science & Engineering learning partner.

When you ask technical concept questions, I can build:
- 📊 **Interactive Slide Decks** with visual step flows & viva cheat sheets
- 📄 **Deep Technical Documentation** with code implementations, memory models & complexity
- 👶 **Intuitive ELI5 Analogies** for understanding difficult abstractions
- 💬 **ChatGPT-style Follow-up Conversations** where you can ask deeper questions anytime

---

#### 💡 Try asking me any concept:
- **"What is the difference between C and Python?"**
- **"Explain recursion and the call stack in memory"**
- **"Compare Quicksort vs Mergesort (time complexity & stability)"**
- **"How does Virtual Memory and Page Table work in OS?"**
- **"Explain Dijkstra's shortest path algorithm with steps"**`,
      keyPoints: [
        'Ask technical concept or algorithm questions to generate custom PPT slide decks.',
        'Explore visual step-by-step process flows and viva checklists.',
        'Continue any explanation with multi-turn follow-up questions.',
      ],
      chartData: null, // NO chart for greetings
      subjectTag: 'computer_science',
      searchKeywords: ['computer science basics', 'programming introduction', 'how to learn coding'],
      slides: [], // ZERO slides: greetings do not create PPTs!
    };
  }

  // 1. C vs Python / Comparison
  if (
    (q.includes('c') && q.includes('python')) ||
    (q.includes('difference') && q.includes('c') && q.includes('python'))
  ) {
    return {
      refinedPrompt:
        'Provide a rigorous comparative technical analysis between C and Python for a B.Tech CSE curriculum. Compare compilation model (native ELF vs bytecode interpreted), type systems (static vs dynamic typing), memory management (manual heap pointers via malloc/free vs automated reference-counted garbage collection), execution performance benchmarks, and real-world systems vs application domains.',
      explanation: `### Architectural Comparison: C vs Python

**C** and **Python** represent two foundational yet diametrically opposed philosophies in modern computing. C was designed in 1972 at Bell Labs by Dennis Ritchie for systems programming and operating systems; Python was created in 1991 by Guido van Rossum to maximize developer productivity and readability.

| Architectural Dimension | C Programming Language | Python |
| :--- | :--- | :--- |
| **Execution Model** | Compiled directly to native machine code (ELF/PE) | Interpreted bytecode on a Virtual Machine (CPython) |
| **Type System** | Static, weak/explicit typing (enforced at compile-time) | Dynamic, strong duck-typing (enforced at runtime) |
| **Memory Management** | Manual allocation/deallocation (\`malloc\`, \`free\`) | Automatic garbage collection (Reference Counting + Cyclic GC) |
| **Performance** | Near-metal speed (Baseline 1.0x execution time) | Slower raw execution (30x–100x slower for CPU-bound loops) |
| **Concurrency** | Low-level OS threads (POSIX \`pthreads\`) | Global Interpreter Lock (GIL) limits true multi-core CPU threads |
| **Primary Domains** | OS kernels (Linux), embedded systems, drivers, game engines | AI/ML, data science, web backends, rapid scripting |

#### 1. Compilation vs Interpretation Pipeline
- **C Compilation Pipeline**: Source \`.c\` ➔ Preprocessor ➔ Compiler (\`gcc\`) ➔ Assembly ➔ Linker ➔ Native Machine Binary. The hardware CPU executes CPU opcodes directly with zero runtime overhead.
- **Python Pipeline**: Source \`.py\` ➔ Bytecode compiler ➔ \`.pyc\` instructions ➔ Executed sequentially by the **CPython Virtual Machine (PVM)** evaluation loop (\`ceval.c\`).

#### 2. Memory Management & Pointer Arithmetic
In C, developers manipulate raw virtual memory addresses directly using pointers:
\`\`\`c
int *arr = (int *)malloc(5 * sizeof(int)); // Manual heap allocation
if (arr == NULL) { /* handle out-of-memory */ }
// ... work with memory ...
free(arr); // Inviolable rule: must free, else memory leak
\`\`\`
In Python, every single primitive is a first-class heap object (\`PyObject\`), tracked by automated reference counting:
\`\`\`python
data = [1, 2, 3, 4, 5]  # Python automatically allocates PyListObject and frees it when refcount drops to 0
\`\`\`

#### 3. When to Choose Which?
- Use **C** when microsecond latency, deterministic memory usage, or direct hardware access is required.
- Use **Python** when development velocity, rich library ecosystems (PyTorch, Pandas, FastAPI), and developer ergonomics outweigh raw CPU execution cycles.`,
      keyPoints: [
        'C compiles directly to native hardware machine instructions (AOT), whereas Python executes bytecode on a virtual machine (CPython).',
        'C enforces static compile-time type checking; Python uses dynamic runtime duck typing.',
        'C requires explicit manual memory management via malloc() and free(); Python uses automated reference counting with cyclic GC.',
        'C is 30x–100x faster for compute-intensive tasks, while Python provides vastly superior developer velocity and ecosystem breadth.',
      ],
      chartData: {
        type: 'bar',
        title: 'Execution Time Benchmark (Recursive Fibonacci n=40)',
        labels: ['C (gcc -O3)', 'C (gcc -O0)', 'PyPy (JIT)', 'Python (CPython 3.12)'],
        values: [0.38, 1.15, 3.8, 36.4],
        datasetLabel: 'Execution Time (Seconds - Lower is Faster)',
      },
      subjectTag: 'computer_science',
      searchKeywords: ['c vs python', 'c compilation process', 'python interpreter explained', 'c memory vs python gc'],
      slides: [
        {
          slideNumber: 1,
          title: 'C vs Python: The Two Philosophies of Computing',
          subtitle: 'Low-level hardware control vs high-level developer velocity',
          layout: 'hero',
          badge: 'Foundational Taxonomy',
          keyConcept: 'C maximizes hardware efficiency by talking directly to the CPU; Python maximizes human efficiency by abstracting memory and syntax.',
          bulletPoints: [
            {
              heading: 'C Philosophy',
              description: 'Minimal abstraction, manual memory control, zero runtime overhead. Designed for writing operating systems.',
              tag: 'Systems',
            },
            {
              heading: 'Python Philosophy',
              description: '"Batteries included", rapid iteration, clean readable syntax. Designed to minimize developer friction.',
              tag: 'Application',
            },
            {
              heading: 'The Trade-off Matrix',
              description: '10x faster developer velocity in Python vs 50x–100x faster CPU execution speed in C.',
              tag: 'Trade-off',
            },
          ],
          processSteps: [],
          codeOrFormula: null,
          callout: {
            title: 'Synergy Insight',
            description: 'They often work together: performance-critical Python libraries (NumPy, PyTorch, TensorFlow) are written in C under the hood.',
            type: 'insight',
          },
        },
        {
          slideNumber: 2,
          title: 'The Execution Pipeline: Native ELF vs Virtual Machine Bytecode',
          subtitle: 'Tracing how program instructions reach the silicon CPU',
          layout: 'process',
          badge: 'Compilation Model',
          keyConcept: 'C compiles Ahead-of-Time (AOT) to native machine opcodes; Python compiles to bytecode interpreted by a C-based VM loop.',
          bulletPoints: [
            {
              heading: 'C Ahead-of-Time (AOT)',
              description: 'Source code compiles directly to native binary opcodes for the target CPU architecture.',
              tag: 'Bare Metal',
            },
            {
              heading: 'Python Virtual Machine (PVM)',
              description: 'Source translates into bytecode (.pyc) executed instruction-by-instruction by CPython.',
              tag: 'Bytecode VM',
            },
            {
              heading: 'Global Interpreter Lock (GIL)',
              description: 'CPython uses a mutex (GIL) to protect reference counters, restricting CPU multi-threading in pure Python.',
              tag: 'Concurrency',
            },
          ],
          processSteps: [
            'C: .c Source ➔ Preprocessor ➔ gcc Compiler ➔ Assembler ➔ Linker ➔ Native Binary',
            'Python: .py Source ➔ Bytecode Parser ➔ .pyc Bytecode ➔ CPython ceval.c Loop',
            'Execution: C runs directly on silicon CPU; Python runs inside a host C process',
          ],
          codeOrFormula: '// C: Compiles to standalone native binary\ngcc -O3 main.c -o app\n\n# Python: Interpreted by CPython VM\npython3 main.py',
          callout: {
            title: 'Did You Know?',
            description: 'CPython is itself written in C! When you launch Python, an underlying C program compiles and executes your Python script.',
            type: 'tip',
          },
        },
        {
          slideNumber: 3,
          title: 'Memory Architecture: Raw Pointers vs Reference-Counted GC',
          subtitle: 'Comparing manual heap allocation against automated garbage collection',
          layout: 'deep_dive',
          badge: 'Memory & Safety',
          keyConcept: 'C exposes raw memory addresses through pointers; Python wraps every primitive in a 24+ byte PyObject structure.',
          bulletPoints: [
            {
              heading: 'C Heap Management',
              description: 'Explicit malloc() and free(). Forgetting to free causes leaks; freeing twice causes fatal heap corruption.',
              tag: 'Manual',
            },
            {
              heading: 'Python Automatic GC',
              description: 'Reference counting increments/decrements on assignment. When refcount hits 0, memory is recycled immediately.',
              tag: 'Automatic',
            },
            {
              heading: 'Memory Safety',
              description: 'C code is vulnerable to buffer overflows, dangling pointers, and segfaults. Python provides managed memory safety.',
              tag: 'Safety',
            },
          ],
          processSteps: [],
          codeOrFormula: '// C: Manual Memory Allocation\nint *arr = (int *)malloc(100 * sizeof(int));\nfree(arr); // Inviolable rule\n\n# Python: Automated PyObject\narr = [0] * 100  # Automatically freed',
          callout: {
            title: 'Security Implication',
            description: 'Over 70% of major software vulnerabilities in operating systems stem from memory safety bugs in C/C++.',
            type: 'warning',
          },
        },
        {
          slideNumber: 4,
          title: 'Empirical Performance Benchmark: CPU Execution Time',
          subtitle: 'Benchmarking raw computational speed across compute-heavy algorithms',
          layout: 'chart',
          badge: 'Empirical Benchmark',
          keyConcept: 'In CPU-bound loops (such as recursive Fibonacci n=40), C runs roughly 95x faster than standard CPython.',
          bulletPoints: [
            {
              heading: 'Zero Runtime Overhead',
              description: 'C compiler aggressively inlines functions, unrolls loops, and maps variables directly to CPU hardware registers.',
              tag: 'C Speed',
            },
            {
              heading: 'Dynamic Dispatch Cost',
              description: 'Python performs dictionary lookups and type checks for every operator evaluation at runtime.',
              tag: 'Python Cost',
            },
          ],
          processSteps: [],
          codeOrFormula: null,
          callout: {
            title: 'Benchmark Conclusion',
            description: 'Notice the chart below: C completes in 0.38 seconds, while standard CPython takes 36.4 seconds for the identical calculation.',
            type: 'insight',
          },
        },
        {
          slideNumber: 5,
          title: 'Exam Cheat Sheet: Viva Voce Comparison Matrix',
          subtitle: 'High-yield oral exam questions professors and interviewers always ask',
          layout: 'takeaways',
          badge: 'Exam Revision',
          keyConcept: 'Master these 4 core differentiators cold for full marks on C vs Python viva questions.',
          bulletPoints: [
            {
              heading: 'Q1: Why is Python slower than C?',
              description: 'Dynamic type checking at runtime, bytecode interpretation overhead, and PyObject boxing for all data.',
              tag: 'High Yield',
            },
            {
              heading: 'Q2: What is the Python GIL?',
              description: 'Global Interpreter Lock prevents multiple native threads from executing Python bytecodes simultaneously in CPython.',
              tag: 'Concurrency',
            },
            {
              heading: 'Q3: How does Python achieve high performance in ML?',
              description: 'Libraries like NumPy and PyTorch write their computational cores in C/CUDA and expose Python wrappers.',
              tag: 'Optimization',
            },
            {
              heading: 'Q4: When MUST you choose C over Python?',
              description: 'Operating system kernels, embedded microcontrollers, real-time audio/graphics engines, and device drivers.',
              tag: 'Use Cases',
            },
          ],
          processSteps: [],
          codeOrFormula: null,
          callout: {
            title: 'Viva Golden Rule',
            description: 'State: "C is compiled, statically typed, and manually managed; Python is interpreted, dynamically typed, and garbage collected."',
            type: 'tip',
          },
        },
      ],
    };
  }

  // 2. Recursion
  if (q.includes('recursion') || q.includes('recursive')) {
    return {
      refinedPrompt:
        'Explain the fundamental concept of recursion in computer science for a B.Tech CSE student. Cover the base case vs recursive step, call stack mechanics, space-time complexity analysis, risk of stack overflow, and provide a visual comparative chart showing call stack depth across input sizes.',
      explanation:
        '### Understanding Recursion\n\nRecursion is a computational paradigm where a function solves a problem by calling a copy of itself to solve smaller subproblems of identical structure. Every recursive algorithm relies on two indispensable pillars:\n\n1. **The Base Case**: A terminating condition that returns a concrete value directly without spawning further recursive calls, preventing infinite descent.\n2. **The Recursive Step**: The induction step where the function reduces the problem instance and invokes itself with simpler parameters.\n\n#### The Call Stack in Memory\nEach recursive invocation pushes a new **Stack Frame** onto the program call stack. This frame stores local variables, parameter bindings, and the return address. When the base case is reached, the stack frames unwind in Last-In, First-Out (LIFO) order, returning accumulated results back to callers.\n\n```python\ndef factorial(n):\n    if n <= 1:           # Base Case\n        return 1\n    return n * factorial(n - 1)  # Recursive Step\n```\n\n#### Complexity & Stack Overflow\nIf the recursion depth exceeds the compiler stack limit (commonly 1,000 to 10,000 frames), a `StackOverflowError` occurs. Tail-call optimization (TCO) and memoization are common engineering solutions.',
      keyPoints: [
        'A valid recursive function must always have at least one reachable base case.',
        'Each recursion level allocates a separate stack frame in memory.',
        'Unbounded recursive calls exhaust stack memory, causing stack overflow crashes.',
        'Recursive algorithms can often be transformed into iterative ones using an explicit stack or dynamic programming.',
      ],
      chartData: {
        type: 'line',
        title: 'Call Stack Depth vs Input Size (n)',
        labels: ['n=1', 'n=5', 'n=10', 'n=20', 'n=50', 'n=100'],
        values: [1, 5, 10, 20, 50, 100],
        datasetLabel: 'Stack Frames Allocated',
      },
      subjectTag: 'computer_science',
      searchKeywords: ['c vs python', 'c compilation process', 'python interpreter explained', 'c memory vs python gc'],
      slides: [
        {
          slideNumber: 1,
          title: 'Understanding Recursion: The Divide-and-Conquer Paradigm',
          subtitle: 'Why solve a complex problem all at once when you can solve a smaller copy?',
          layout: 'hero',
          badge: 'Core Intuition',
          keyConcept: 'Recursion is self-referential problem reduction: break down input until you hit a trivial, pre-solved case.',
          bulletPoints: [
            {
              heading: 'Russian Doll Principle',
              description: 'Open larger doll to reveal identical smaller doll, repeating until the smallest solid doll is reached.',
              tag: 'Analogy',
            },
            {
              heading: 'The Two Inviolable Laws',
              description: 'Law 1: Must have a Base Case. Law 2: Each recursive step must strictly move closer to that Base Case.',
              tag: 'Rule',
            },
            {
              heading: 'Memory Trade-off',
              description: 'Trading clean mathematical elegance for linear call stack space consumption in RAM.',
              tag: 'Architecture',
            },
          ],
          processSteps: [],
          codeOrFormula: null,
          callout: {
            title: 'Foundational Truth',
            description: 'Any problem that can be solved recursively can also be solved iteratively using an explicit stack.',
            type: 'insight',
          },
        },
        {
          slideNumber: 2,
          title: 'The Execution Mechanics: Stack Frames in RAM',
          subtitle: 'Step-by-step trace of how the OS call stack allocates and unwinds recursive invocations',
          layout: 'process',
          badge: 'Memory Architecture',
          keyConcept: 'Every invocation pushes a fresh stack frame (parameters + local variables + return pointer) onto the thread stack.',
          bulletPoints: [
            {
              heading: 'Push Phase (Descent)',
              description: 'factorial(3) pushes frame -> pauses -> calls factorial(2) -> pushes frame -> calls factorial(1).',
              tag: 'Push',
            },
            {
              heading: 'Base Case Hit',
              description: 'factorial(1) evaluates n <= 1, returns literal 1 without generating any further calls.',
              tag: 'Terminal',
            },
            {
              heading: 'Pop Phase (Unwinding)',
              description: 'Frames resolve in LIFO order: 1 * 2 = 2 returned to caller, then 2 * 3 = 6 returned as final answer.',
              tag: 'Pop (LIFO)',
            },
          ],
          processSteps: [
            'Caller invokes factorial(3) [Frame 1 created]',
            'factorial(3) calls factorial(2) [Frame 2 pushed]',
            'factorial(2) calls factorial(1) [Frame 3 pushed]',
            'Base Case reached: returns 1 [Frame 3 popped]',
            'factorial(2) computes 2 * 1 = 2 [Frame 2 popped]',
            'factorial(3) computes 3 * 2 = 6 [Final return]',
          ],
          codeOrFormula: 'def factorial(n):\n    if n <= 1: return 1\n    return n * factorial(n - 1)',
          callout: {
            title: 'LIFO Execution Order',
            description: 'Last-In, First-Out: The deepest function call is the very first one to finish executing and pop.',
            type: 'tip',
          },
        },
        {
          slideNumber: 3,
          title: 'Complexity & The Stack Overflow Danger Zone',
          subtitle: 'Theoretical bounds, recursive overhead, and defense mechanisms in production',
          layout: 'deep_dive',
          badge: 'Performance & Risk',
          keyConcept: 'Without tail-call optimization or bounding, recursion consumes O(N) auxiliary space, risking fatal process crashes.',
          bulletPoints: [
            {
              heading: 'Time Complexity',
              description: 'For factorial/linear recursion: O(N) operations. For Fibonacci without memoization: devastating O(2^N).',
              tag: 'Time: O(N)',
            },
            {
              heading: 'Space Complexity',
              description: 'O(N) memory consumed exclusively by stack frames (8MB default stack on Linux typically overflows around 10k frames).',
              tag: 'Space: O(N)',
            },
            {
              heading: 'Production Defenses',
              description: 'Tail Call Optimization (TCO), memoization tables, or rewriting with an explicit while-loop + vector.',
              tag: 'Mitigation',
            },
          ],
          processSteps: [],
          codeOrFormula: 'Recursion Depth Limit (Python): sys.getrecursionlimit() -> 1000\nLinux Stack Size Limit: ulimit -s -> 8192 KB',
          callout: {
            title: 'Fatal Bug: Infinite Recursion',
            description: 'Missing or unreachable base case guarantees SIGSEGV / RecursionError as stack frames collide with the heap.',
            type: 'warning',
          },
        },
        {
          slideNumber: 4,
          title: 'Empirical Stack Depth Scaling',
          subtitle: 'Visual metric analysis showing linear call stack growth proportional to input size n',
          layout: 'chart',
          badge: 'Empirical Benchmark',
          keyConcept: 'Memory footprint grows linearly with input magnitude, proving the O(N) auxiliary space constraint.',
          bulletPoints: [
            {
              heading: 'Strict Linear Growth',
              description: 'Each unit increment of input n forces exactly one additional 48-byte stack frame allocation.',
              tag: 'Linear',
            },
            {
              heading: 'Benchmarking Takeaway',
              description: 'Always prefer tree/graph recursion (depth O(log N)) over linear chains when processing deep datasets.',
              tag: 'Guideline',
            },
          ],
          processSteps: [],
          codeOrFormula: null,
          callout: {
            title: 'Visual Proof',
            description: 'Notice the linear 45-degree slope in the chart below: stack frames scale 1:1 with input depth.',
            type: 'insight',
          },
        },
        {
          slideNumber: 5,
          title: 'Exam Cheat Sheet: High-Yield Viva Questions',
          subtitle: 'What professors and interviewers always ask about recursion',
          layout: 'takeaways',
          badge: 'Exam Revision',
          keyConcept: 'Master these 4 core concepts for full viva marks on recursion questions.',
          bulletPoints: [
            {
              heading: 'Q1: What happens if base case is omitted?',
              description: 'Infinite calls occur until compiler stack space is exhausted, raising StackOverflowError.',
              tag: 'High Yield',
            },
            {
              heading: 'Q2: How does Tail Recursion optimize memory?',
              description: 'When recursive call is the final action, the compiler reuses the current stack frame in-place (O(1) space).',
              tag: 'Optimization',
            },
            {
              heading: 'Q3: Recursion vs Iteration trade-off?',
              description: 'Recursion is more readable and matches inductive data structures (trees/graphs); iteration is faster and O(1) space.',
              tag: 'Trade-off',
            },
            {
              heading: 'Q4: How do you prevent overlapping subproblems?',
              description: 'Apply Memoization (caching return values in a hash table) or bottom-up Tabulation (Dynamic Programming).',
              tag: 'Dynamic Prog',
            },
          ],
          processSteps: [],
          codeOrFormula: null,
          callout: {
            title: 'Viva Rule of Thumb',
            description: 'Always state the Base Case condition FIRST in any viva coding question before writing logic.',
            type: 'tip',
          },
        },
      ],
    };
  }

  // 3a. Selection Sort vs Insertion Sort
  if (q.includes('selection') && q.includes('insertion')) {
    return {
      refinedPrompt:
        'Provide a rigorous algorithmic comparison between Selection Sort and Insertion Sort for B.Tech CSE students. Analyze time complexity in best, average, and worst cases, comparison vs swap counts, memory write minimization, adaptive properties, and algorithmic stability.',
      explanation: `### Algorithmic Comparison: Selection Sort vs Insertion Sort

Both **Selection Sort** and **Insertion Sort** are elementary $O(N^2)$ comparison-based sorting algorithms, but they operate on fundamentally opposite selection and insertion mechanics.

| Dimension | Selection Sort | Insertion Sort |
| :--- | :--- | :--- |
| **Best-Case Time** | **$O(N^2)$** (always scans remaining unsorted suffix) | **$O(N)$** (linear scan on already sorted input) |
| **Average / Worst Time** | $O(N^2)$ comparisons | $O(N^2)$ comparisons & shifts |
| **Total Memory Swaps** | **$O(N)$** swaps (at most 1 swap per outer pass) | $O(N^2)$ element shifts in worst-case |
| **Algorithmic Stability** | **Unstable** (long-distance swaps displace equal keys) | **Stable** (inserts strictly before equal keys) |
| **Adaptive Behavior** | Non-adaptive (runtime unaffected by pre-sorted order) | **Highly Adaptive** ($O(N + d)$ where $d$ is inversions count) |
| **Online Processing** | No (requires entire dataset upfront) | **Yes (Online)** (can sort streaming inputs continuously) |
| **Optimal Production Use** | EEPROM/Flash memory where write cycles are costly | Small arrays ($N \\le 16-32$), nearly sorted streams, Timsort run base |

#### 1. Core Algorithmic Mechanics
- **Selection Sort**: Divides the list into a sorted prefix and an unsorted suffix. In each pass, it linearly scans the unsorted suffix to find the absolute minimum key and swaps it once into its final destination.
- **Insertion Sort**: Maintains a sorted prefix. For each new element, it shifts all larger sorted elements one position to the right and inserts the key into its correct relative position.`,
      keyPoints: [
        'Selection Sort minimizes memory writes: strictly O(N) swaps regardless of input permutation.',
        'Insertion Sort is adaptive: achieves O(N) time on nearly sorted datasets with zero swaps.',
        'Insertion Sort is stable; standard Selection Sort is unstable due to long-range swaps.',
        'Modern hybrid sorting engines (Timsort in Python/Java, Introsort in C++) use Insertion Sort as their small-array base case.',
      ],
      chartData: {
        type: 'bar',
        title: 'Memory Write Operations Count (N = 1,000 Elements)',
        labels: ['Selection Sort (Any Array)', 'Insertion Sort (Worst Case)', 'Bubble Sort (Worst Case)', 'Quicksort (Average)'],
        values: [1000, 499500, 499500, 7000],
        datasetLabel: 'Array Write / Swap Cycles',
      },
      subjectTag: 'computer_science',
      searchKeywords: ['selection sort vs insertion sort', 'insertion sort adaptive complexity', 'selection sort memory writes', 'sorting algorithm comparison'],
      slides: [
        {
          slideNumber: 1,
          title: 'Selection Sort vs Insertion Sort: Trade-Off Analysis',
          subtitle: 'Minimizing Memory Writes vs Exploiting Pre-Sorted Data',
          layout: 'hero',
          badge: 'Algorithmic Comparison',
          keyConcept: 'Selection Sort performs O(N) writes with O(N²) comparisons; Insertion Sort performs O(N) time on nearly-sorted data.',
          bulletPoints: [
            { heading: 'Selection Sort Philosophy', description: 'Scan unsorted subarray for the minimum element, swap once per pass. Guaranteed O(N) writes.', tag: 'Fewest Writes' },
            { heading: 'Insertion Sort Philosophy', description: 'Pick next item and shift larger elements right. Adapts to input order with O(N) best case.', tag: 'Adaptive' },
            { heading: 'Stability Distinction', description: 'Insertion Sort preserves relative order of identical elements; Selection Sort swaps break stability.', tag: 'Stability' },
          ],
          processSteps: [],
          codeOrFormula: null,
          callout: {
            title: 'Flash / EEPROM Invariant',
            description: 'When writing to hardware where flash write cycles wear out memory cells (EEPROMs), Selection Sort is preferred over Insertion Sort because it guarantees at most N swaps.',
            type: 'insight',
          },
        },
        {
          slideNumber: 2,
          title: 'Execution Invariants & Step Traces',
          subtitle: 'How each algorithm partitions the working array during execution',
          layout: 'process',
          badge: 'Execution Invariants',
          keyConcept: 'Selection Sort establishes final positions from left to right; Insertion Sort establishes relative order within sorted prefix.',
          bulletPoints: [
            { heading: 'Selection Invariant', description: 'A[0..i-1] contains the smallest i elements of the entire array, already in their final resting positions.', tag: 'Global Min' },
            { heading: 'Insertion Invariant', description: 'A[0..i-1] is sorted among itself, but elements may shift further right as future keys are inserted.', tag: 'Local Relative' },
          ],
          processSteps: [
            'Selection Sort: for i=0 to n-2 ➔ minIdx = i ➔ scan j=i+1..n-1 ➔ swap(A[i], A[minIdx])',
            'Insertion Sort: for i=1 to n-1 ➔ key = A[i] ➔ shift elements > key right ➔ A[j+1] = key',
          ],
          codeOrFormula: '// Selection Sort: exactly N-1 swaps\nfor (int i = 0; i < n-1; i++) {\n  int minIdx = i;\n  for (int j = i+1; j < n; j++)\n    if (arr[j] < arr[minIdx]) minIdx = j;\n  swap(&arr[i], &arr[minIdx]);\n}',
          callout: {
            title: 'Viva Examination Tip',
            description: 'Viva question: "Is Insertion Sort an online algorithm?" Answer: Yes, because it can process and sort incoming items in a continuous stream without knowing future inputs.',
            type: 'tip',
          },
        },
      ],
    };
  }

  // 3b. Bubble Sort
  if (q.includes('bubble')) {
    return {
      refinedPrompt:
        'Provide a rigorous technical breakdown of the Bubble Sort algorithm for B.Tech CSE students. Cover adjacent comparison mechanics, early termination optimization via swapped flags, best/worst-case Big-O bounds, space complexity, stability proof, and why it is primarily educational rather than production-grade.',
      explanation: `### Algorithmic Breakdown: Bubble Sort

**Bubble Sort** is an elementary comparison-based sorting algorithm that repeatedly steps through a list, compares adjacent elements, and swaps them if they are in the wrong order. With each outer pass, the largest unsorted element "bubbles up" to its correct position at the end of the array.

| Dimension | Optimized Bubble Sort | Standard Bubble Sort |
| :--- | :--- | :--- |
| **Best-Case Time Complexity** | **$O(N)$** (with early termination check) | $O(N^2)$ (unconditionally checks all pairs) |
| **Average-Case Time Complexity** | **$O(N^2)$** | $O(N^2)$ |
| **Worst-Case Time Complexity** | **$O(N^2)$** (reverse sorted array) | $O(N^2)$ |
| **Auxiliary Space Complexity** | **$O(1)$** (In-place sort) | $O(1)$ |
| **Algorithmic Stability** | **Stable** (strictly swaps when $A[j] > A[j+1]$) | Stable |
| **Total Comparison Count** | $\\sum_{k=1}^{N-1} k = \\frac{N(N-1)}{2}$ worst case | $\\frac{N(N-1)}{2}$ |
| **Total Swap Count** | 0 (best) to $\\frac{N(N-1)}{2}$ (worst) | $\\frac{N(N-1)}{2}$ worst case |

---

#### 1. Core Algorithmic Mechanics
1. **Adjacent Comparisons**: In pass $i$, pointers scan indices $j$ from $0$ up to $N - i - 2$.
2. **Local Invariant Restoration**: If $arr[j] > arr[j+1]$, elements are swapped. Equal elements ($arr[j] == arr[j+1]$) are never swapped, guaranteeing **algorithmic stability**.
3. **Suffix Settling**: After pass $i$, the largest remaining element is locked into index $N - 1 - i$.
4. **Early Exit Optimization**: If a full pass completes with zero swaps executed, the array is already sorted, enabling early termination in $O(N)$ time.`,
      keyPoints: [
        'Bubble Sort is an in-place, stable comparison sort with O(1) auxiliary memory.',
        'With an early-termination flag (swapped = false), best-case time complexity drops to O(N).',
        'Worst-case time complexity is O(N²) when the input array is sorted in reverse order.',
        'Bubble Sort is rarely used in production due to high constant factors and excessive cache-unfriendly memory writes.',
      ],
      chartData: {
        type: 'bar',
        title: 'Bubble Sort Comparisons: Optimized vs Unoptimized (N = 100)',
        labels: ['Best Case (Optimized)', 'Best Case (Standard)', 'Average Case', 'Worst Case (Reversed)'],
        values: [99, 4950, 4950, 4950],
        datasetLabel: 'Number of Element Comparisons',
      },
      subjectTag: 'computer_science',
      searchKeywords: ['bubble sort algorithm', 'bubble sort time complexity', 'bubble sort early termination', 'stable sorting algorithms'],
      slides: [
        {
          slideNumber: 1,
          title: 'Bubble Sort: Algorithmic Mechanics & Properties',
          subtitle: 'Adjacent comparisons and iterative floating of maximum keys',
          layout: 'hero',
          badge: 'Sorting Fundamentals',
          keyConcept: 'Repeatedly swaps adjacent out-of-order pairs until the largest elements settle at the upper end of the array.',
          bulletPoints: [
            { heading: 'Bubbling Action', description: 'Elements move towards their final destinations through contiguous pair exchanges.', tag: 'In-Place' },
            { heading: 'Stability Guarantee', description: 'Because strictly greater-than check (>) is used, equal keys maintain original order.', tag: 'Stable' },
            { heading: 'Early Termination', description: 'If an entire pass yields zero swaps, execution breaks early in linear O(N) time.', tag: 'Optimization' },
          ],
          processSteps: [],
          codeOrFormula: null,
          callout: {
            title: 'Invariant Rule',
            description: 'After the k-th pass of Bubble Sort, the last k elements of the array are guaranteed to be in their final sorted positions.',
            type: 'insight',
          },
        },
        {
          slideNumber: 2,
          title: 'Optimized Implementation & Trace',
          subtitle: 'Step-by-step C implementation with swapped boolean flag',
          layout: 'process',
          badge: 'Code Implementation',
          keyConcept: 'Preventing unnecessary passes via a boolean swap sentinel flag.',
          bulletPoints: [
            { heading: 'Inner Loop Bound', description: 'Limit to n - i - 1 to avoid redundant comparisons against already sorted suffix.', tag: 'Bound' },
            { heading: 'Swap Sentinel', description: 'Set swapped = true inside the if block; break if false at the end of the outer loop.', tag: 'Sentinel' },
          ],
          processSteps: [
            'Initialize swapped = false at start of each outer pass i',
            'Iterate j from 0 to n - i - 2, comparing arr[j] and arr[j+1]',
            'If arr[j] > arr[j+1], swap them and set swapped = true',
            'If swapped is still false after inner loop, terminate immediately',
          ],
          codeOrFormula: 'void bubbleSort(int arr[], int n) {\n  for (int i = 0; i < n - 1; i++) {\n    bool swapped = false;\n    for (int j = 0; j < n - i - 1; j++) {\n      if (arr[j] > arr[j + 1]) {\n        swap(&arr[j], &arr[j + 1]);\n        swapped = true;\n      }\n    }\n    if (!swapped) break;\n  }\n}',
          callout: {
            title: 'Viva Question Alert',
            description: 'Viva question: "What is the best case time complexity of unoptimized vs optimized Bubble Sort?" Answer: O(N²) for unoptimized, but O(N) for optimized using the swapped flag.',
            type: 'tip',
          },
        },
      ],
    };
  }

  // 3c. Selection Sort Single
  if (q.includes('selection')) {
    return {
      refinedPrompt:
        'Provide a technical breakdown of Selection Sort for B.Tech CSE students. Cover scan mechanics, minimum index selection, swap count minimization, unstable sorting proofs, and Big-O complexity.',
      explanation: `### Algorithmic Breakdown: Selection Sort

**Selection Sort** is an in-place comparison sort that divides the input array into two parts: a sorted subarray built up from left to right at the front, and a remaining unsorted subarray occupying the rest of the array.

| Dimension | Selection Sort Parameter |
| :--- | :--- |
| **Time Complexity (All Cases)** | **$O(N^2)$** (Best, Average, and Worst are all identical) |
| **Comparisons Count** | $\\frac{N(N-1)}{2}$ comparisons in every case |
| **Total Memory Swaps** | **At most $N - 1$ swaps** ($O(N)$ bound) |
| **Auxiliary Memory Space** | **$O(1)$** auxiliary (strict in-place) |
| **Algorithmic Stability** | **Unstable** (long-distance swaps disrupt equal key orders) |
| **Key Advantage** | Minimizes write cycles into memory hardware |

#### Algorithmic Invariant
In iteration $i$ (from $0$ to $N - 2$):
1. Scan $arr[i+1 \\dots N-1]$ to find the index $minIdx$ with minimum value.
2. Swap $arr[i]$ with $arr[minIdx]$.
3. Array slice $arr[0 \\dots i]$ is now sorted and will never be touched again.`,
      keyPoints: [
        'Selection Sort performs O(N²) comparisons across all inputs without exception.',
        'Performs at most N - 1 swaps, making it ideal when memory write costs are high.',
        'Selection Sort is unstable in standard array representations.',
        'Does not adapt to pre-sorted inputs.',
      ],
      chartData: {
        type: 'bar',
        title: 'Comparison vs Swap Operations in Selection Sort (N = 50)',
        labels: ['Comparisons (Best Case)', 'Comparisons (Worst Case)', 'Swaps (Worst Case)', 'Swaps (Best Case)'],
        values: [1225, 1225, 49, 0],
        datasetLabel: 'Operations Count',
      },
      subjectTag: 'computer_science',
      searchKeywords: ['selection sort algorithm', 'selection sort time complexity', 'unstable sorting algorithms', 'minimum swap sorting'],
      slides: [
        {
          slideNumber: 1,
          title: 'Selection Sort: Minimum Selection Strategy',
          subtitle: 'Linear scan for global minimum with exactly one swap per pass',
          layout: 'hero',
          badge: 'Algorithm Design',
          keyConcept: 'Find the minimum element in unsorted subarray and place it at the beginning of the unsorted segment.',
          bulletPoints: [
            { heading: 'Minimal Memory Writes', description: 'Requires at most N - 1 swaps in total, drastically fewer writes than Bubble Sort.', tag: 'Fewest Writes' },
            { heading: 'Fixed Comparison Cost', description: 'Always performs N(N-1)/2 comparisons regardless of whether input is sorted or reversed.', tag: 'O(N²)' },
            { heading: 'Unstable Nature', description: 'Swapping an element over equal elements destroys initial sequence order.', tag: 'Unstable' },
          ],
          processSteps: [],
          codeOrFormula: null,
          callout: {
            title: 'Why Unstable?',
            description: 'Example: [4a, 4b, 2]. Minimum is 2. Swapping 4a with 2 yields [2, 4b, 4a]. Notice 4b now precedes 4a! Hence unstable.',
            type: 'warning',
          },
        },
      ],
    };
  }

  // 3d. Insertion Sort Single
  if (q.includes('insertion')) {
    return {
      refinedPrompt:
        'Provide a technical breakdown of Insertion Sort for B.Tech CSE students. Cover key extraction, right-shifting of sorted prefix, adaptive linear time on nearly-sorted data, stability proof, and usage in hybrid sorting algorithms.',
      explanation: `### Algorithmic Breakdown: Insertion Sort

**Insertion Sort** is an adaptive, stable, in-place comparison sort that builds the final sorted array one item at a time. It is analogous to the way most people sort a hand of playing cards.

| Dimension | Insertion Sort Parameter |
| :--- | :--- |
| **Best-Case Time Complexity** | **$O(N)$** (When array is already sorted or nearly sorted) |
| **Average-Case Time Complexity** | **$O(N^2)$** ($\approx N^2 / 4$ comparisons and shifts) |
| **Worst-Case Time Complexity** | **$O(N^2)$** ($\approx N^2 / 2$ comparisons and shifts for reverse array) |
| **Auxiliary Memory Space** | **$O(1)$** auxiliary (In-place) |
| **Algorithmic Stability** | **Stable** (items with equal keys are never shifted past each other) |
| **Online Capability** | **Yes** (processes elements as they arrive from a stream) |

#### Algorithmic Invariant
In iteration $i$ (from $1$ to $N - 1$):
1. Element $key = arr[i]$ is extracted into a temporary variable.
2. Elements in $arr[0 \\dots i-1]$ that are greater than $key$ shift one position right.
3. The $key$ is placed into the resulting vacant slot.`,
      keyPoints: [
        'Insertion Sort is adaptive: runs in O(N) linear time on sorted or nearly sorted datasets.',
        'Maintains algorithmic stability by strictly shifting elements greater than the key.',
        'Online algorithm: capable of sorting elements continuously as they arrive in a stream.',
        'Core building block of hybrid algorithms like Timsort (Python, Java) and Introsort (C++ std::sort).',
      ],
      chartData: {
        type: 'bar',
        title: 'Insertion Sort Time Comparison across Input Permutations (N = 1,000)',
        labels: ['Already Sorted (Best)', '10% Disordered', 'Random Permutation', 'Reverse Sorted (Worst)'],
        values: [1000, 55000, 250000, 499500],
        datasetLabel: 'Comparison & Shift Operations',
      },
      subjectTag: 'computer_science',
      searchKeywords: ['insertion sort algorithm', 'adaptive sorting algorithm', 'online sorting algorithms', 'timsort base case'],
      slides: [
        {
          slideNumber: 1,
          title: 'Insertion Sort: Incremental Placement Strategy',
          subtitle: 'Shifting larger elements right to insert key into sorted prefix',
          layout: 'hero',
          badge: 'Adaptive Algorithm',
          keyConcept: 'Iteratively extracts a key element and shifts larger sorted elements right to insert the key into place.',
          bulletPoints: [
            { heading: 'Adaptive Speed', description: 'Runs in O(N) on sorted lists with exactly 1 comparison and 0 shifts per element.', tag: 'O(N) Best' },
            { heading: 'Strict Stability', description: 'Because elements equal to the key are never shifted, initial relative ordering is preserved.', tag: 'Stable' },
            { heading: 'Streaming / Online', description: 'Can continuously sort elements received one by one over an input socket or stream.', tag: 'Online' },
          ],
          processSteps: [],
          codeOrFormula: null,
          callout: {
            title: 'Production Relevance',
            description: 'Why do we study O(N²) Insertion Sort? Because on small subarrays (N <= 32), its tiny constant factor and cache locality beat Quicksort and Mergesort. Modern engines (Python Timsort, C++ Introsort) switch to Insertion Sort for small partitions!',
            type: 'insight',
          },
        },
      ],
    };
  }

  // 3e. Quicksort vs Mergesort / Sorting
  if (q.includes('quicksort') || q.includes('mergesort') || q.includes('sort')) {
    return {
      refinedPrompt:
        'Provide a rigorous algorithmic comparison between Quicksort and Mergesort for B.Tech CSE students. Analyze partitioning vs merging, worst-case vs average-case time complexity, in-place auxiliary space requirements, algorithmic stability, and cache locality performance on modern CPUs.',
      explanation: `### Algorithmic Comparison: Quicksort vs Mergesort

Both **Quicksort** and **Mergesort** are classical **Divide-and-Conquer** comparison sorting algorithms, but they divide and conquer in completely opposite phases.

| Parameter | Quicksort | Mergesort |
| :--- | :--- | :--- |
| **Best / Average Time** | O(N log N) | O(N log N) |
| **Worst-Case Time** | **O(N²)** (poor pivot choice) | **O(N log N)** (guaranteed) |
| **Auxiliary Space** | **O(log N)** (In-place call stack) | **O(N)** (Requires auxiliary buffer) |
| **Algorithmic Stability** | Unstable (by default) | **Stable** (preserves equal keys) |
| **Cache Locality** | Excellent (sequential cache lines) | Poor (copies between buffers) |
| **Preferred Domain** | In-memory arrays, systems programming | Linked lists, external disk sorting |

#### 1. Core Algorithmic Mechanics
- **Quicksort**: Does the heavy work in the **divide** phase. Selects a pivot element and partitions the array such that all elements $\\le$ pivot are to the left, and elements $>$ pivot are to the right. Recursively sorts sub-arrays.
- **Mergesort**: Does the heavy work in the **combine** phase. Arbitrarily divides array at the midpoint $N/2$ with zero comparison work, recursively sorts both halves, and then performs a linear $O(N)$ merge pass.`,
      keyPoints: [
        'Quicksort sorts in-place with O(log N) stack space; Mergesort requires O(N) auxiliary memory for buffer merging.',
        'Mergesort guarantees O(N log N) worst-case time; Quicksort degrades to O(N²) when encountering adversarial pivots.',
        'Mergesort is stable; standard Quicksort is unstable.',
        'Quicksort exhibits superior CPU hardware cache locality in practical real-world benchmarks.',
      ],
      chartData: {
        type: 'bar',
        title: 'Sorting Operations Benchmark (Array Size N=100,000)',
        labels: ['Quicksort (Random)', 'Quicksort (Worst Case)', 'Mergesort (Any Case)', 'Heap Sort'],
        values: [1400000, 5000000000, 1600000, 1900000],
        datasetLabel: 'Comparison Operations Count',
      },
      subjectTag: 'computer_science',
      searchKeywords: ['quicksort vs mergesort', 'quicksort partitioning', 'merge sort step by step', 'sorting algorithm time complexity'],
      slides: [
        {
          slideNumber: 1,
          title: 'Quicksort vs Mergesort: The Divide-and-Conquer Duel',
          subtitle: 'Partition-first vs Merge-last: Two opposing computational approaches',
          layout: 'hero',
          badge: 'Algorithmic Paradigm',
          keyConcept: 'Quicksort does heavy work during the partition phase; Mergesort does heavy work during the merge phase.',
          bulletPoints: [
            { heading: 'Quicksort Strategy', description: 'Pick pivot, partition in-place, recurse left and right. Zero merge cost.', tag: 'Partition' },
            { heading: 'Mergesort Strategy', description: 'Split at midpoint trivially, recurse, then merge two sorted halves. O(N) merge cost.', tag: 'Merge' },
            { heading: 'Practical Winner', description: 'Quicksort is 2-3x faster in real hardware memory due to sequential CPU cache locality.', tag: 'Cache' },
          ],
          processSteps: [],
          codeOrFormula: null,
          callout: {
            title: 'Space vs Guarantee',
            description: 'Quicksort trades worst-case safety for O(1) space; Mergesort trades O(N) memory for guaranteed O(N log N) speed.',
            type: 'insight',
          },
        },
        {
          slideNumber: 2,
          title: 'Algorithmic Execution Pipelines',
          subtitle: 'Step-by-step partition trace vs split-and-merge trace',
          layout: 'process',
          badge: 'Execution Trace',
          keyConcept: 'Tracing Lomuto/Hoare partition steps vs two-pointer merge merging.',
          bulletPoints: [
            { heading: 'Hoare Partition', description: 'Two pointers move toward each other, swapping out-of-order elements around pivot.', tag: 'In-Place' },
            { heading: 'Two-Way Merge', description: 'Compare heads of two sorted sub-lists, copying the smaller element into output buffer.', tag: 'Stable' },
          ],
          processSteps: [
            'Quicksort: Select pivot ➔ Partition array into [<= pivot] and [> pivot] ➔ Recurse',
            'Mergesort: Find mid = (L+R)/2 ➔ Sort(L..mid) ➔ Sort(mid+1..R) ➔ Merge(L, mid, R)',
          ],
          codeOrFormula: '// Quicksort Partition:\nwhile (A[i] < pivot) i++;\nwhile (A[j] > pivot) j--;\nswap(A[i], A[j]);',
          callout: {
            title: 'Stability Invariant',
            description: 'Mergesort is naturally STABLE (preserves equal items order). Quicksort pointer swaps break original order.',
            type: 'tip',
          },
        },
        {
          slideNumber: 3,
          title: 'Big-O Space & Time Complexity Bounds',
          subtitle: 'Best, average, and pathological worst-case behaviors',
          layout: 'deep_dive',
          badge: 'Complexity Analysis',
          keyConcept: 'Quicksort suffers O(N²) on sorted arrays with naive pivot; modern implementations use Dual-Pivot or Median-of-Three.',
          bulletPoints: [
            { heading: 'Time Bounds', description: 'Mergesort: Always O(N log N). Quicksort: Avg O(N log N), Worst O(N²).', tag: 'Time' },
            { heading: 'Space Bounds', description: 'Mergesort: O(N) buffer. Quicksort: O(log N) stack memory.', tag: 'Space' },
          ],
          processSteps: [],
          codeOrFormula: 'Mergesort Recurrence: T(N) = 2T(N/2) + O(N) -> O(N log N)\nQuicksort Worst Case: T(N) = T(N-1) + O(N) -> O(N^2)',
          callout: {
            title: 'Adversarial Worst Case',
            description: 'Selecting the first/last element on an already sorted array yields O(N²) recursion depth.',
            type: 'warning',
          },
        },
        {
          slideNumber: 4,
          title: 'Empirical Operations Scaling',
          subtitle: 'Measured operation counts across array size N=100,000',
          layout: 'chart',
          badge: 'Benchmark',
          keyConcept: 'Notice the astronomical spike when Quicksort hits worst-case partitioning.',
          bulletPoints: [
            { heading: 'Random Array Efficiency', description: 'Quicksort performs fewer overall memory write operations than Mergesort.', tag: 'Efficiency' },
          ],
          processSteps: [],
          codeOrFormula: null,
          callout: {
            title: 'Why C qsort uses Quicksort',
            description: 'Standard library implementations prefer Quicksort or Introsort because cache hits outweigh theoretical worst-cases.',
            type: 'insight',
          },
        },
        {
          slideNumber: 5,
          title: 'Exam Cheat Sheet: Viva Sorting Matrix',
          subtitle: 'Oral examination checklist for sorting algorithms',
          layout: 'takeaways',
          badge: 'Viva Prep',
          keyConcept: 'The 4 questions examiners ask in algorithm viva examinations.',
          bulletPoints: [
            { heading: 'Why not always Mergesort?', description: 'O(N) memory allocation overhead and poor CPU cache locality make it slower in RAM.', tag: 'Viva Q1' },
            { heading: 'Why is Mergesort used for Linked Lists?', description: 'Nodes can be merged by re-pointing pointers without allocating O(N) extra buffers.', tag: 'Viva Q2' },
            { heading: 'What is Introsort?', description: 'Starts with Quicksort, switches to Heapsort if recursion depth exceeds 2 log N to eliminate O(N²).', tag: 'Viva Q3' },
            { heading: 'What is Timsort?', description: 'Hybrid of Mergesort and Insertion Sort used in Python (list.sort) and Java (Arrays.sort).', tag: 'Viva Q4' },
          ],
          processSteps: [],
          codeOrFormula: null,
          callout: {
            title: 'Viva Summary',
            description: 'Mergesort for stability and guaranteed O(N log N); Quicksort for speed, in-place memory, and cache efficiency.',
            type: 'tip',
          },
        },
      ],
    };
  }

  // 3f. Databases / ACID Transactions
  if (
    q.includes('database') ||
    q.includes('transaction') ||
    q.includes('acid') ||
    (q.includes('secure') && (q.includes('db') || q.includes('data') || q.includes('bank') || q.includes('financial') || q.includes('suitable')))
  ) {
    return {
      refinedPrompt:
        'Provide an authoritative database architectural guide for secure, mission-critical financial transactions. Compare Relational RDBMS (PostgreSQL, MySQL InnoDB) vs Distributed NewSQL (CockroachDB, Google Spanner) vs NoSQL (MongoDB, DynamoDB). Analyze ACID guarantees, Isolation levels (Read Committed vs Serializable SSI), WAL (Write-Ahead Logging), Two-Phase Commit (2PC), and data encryption at rest and in transit.',
      explanation: `### Database Architecture: Selecting the Optimal Engine for Secure Transactions

For systems handling mission-critical, high-value financial transactions (e.g. banking ledgers, e-commerce checkouts, payment processing), the database engine must provide non-negotiable **ACID guarantees** (Atomicity, Consistency, Isolation, Durability) to prevent double-spending, phantom reads, and dirty state corruptions.

| Architectural Tier | Top Database Recommendation | Transaction Model | Isolation Level Support | Best Use Case |
| :--- | :--- | :--- | :--- | :--- |
| **Battle-Tested RDBMS** | **PostgreSQL** | Strict ACID (MVCC + WAL) | Read Committed up to **Serializable (SSI)** | Core banking, payments, fintech backends, order ledgers |
| **Globally Distributed NewSQL** | **CockroachDB / Google Spanner** | Distributed ACID (Raft Consensus + 2PC) | Strict **Serializable** globally | Multi-region financial ledgers, cloud banking across continents |
| **Enterprise Relational** | **MySQL (InnoDB Engine)** | Strict ACID (Undo/Redo Logs + Row Locks) | Repeatable Read (Default) up to Serializable | High-throughput web commerce, account balances |
| **Document / NoSQL** | **MongoDB (v4.0+ Multi-Doc ACID)** | Document-level ACID / Distributed Sessions | Local, Majority, Linearizable | Product catalogs, user profiles (Avoid for primary ledger) |

---

#### 1. The 4 Non-Negotiable ACID Pillars for Secure Transactions

1. **Atomicity (All-or-Nothing Execution)**:
   - In a fund transfer (Debit Account A by $100; Credit Account B by $100), either **both** operations succeed and commit, or **both** rollback completely.
   - Enforced via the **WAL (Write-Ahead Log)** and undo segments.

2. **Consistency (State Invariant Enforcement)**:
   - Database schema invariants, check constraints (e.g. \`balance >= 0\`), and foreign keys are guaranteed true before and after the transaction.

3. **Isolation (Concurrent Execution Safety)**:
   - Multiple users executing transactions simultaneously must not interfere with each other.
   - **Serializable Snapshot Isolation (SSI)** in PostgreSQL provides mathematical proof against all concurrency anomalies: Dirty Reads, Non-Repeatable Reads, Phantom Reads, and Write Skew.

4. **Durability (Fault Recovery Guarantee)**:
   - Once a transaction commits, its modifications are permanently recorded on non-volatile storage.
   - Even if the server suffers an abrupt power loss 1 millisecond later, the database performs **Crash Recovery (REDO log playback)** upon reboot to restore committed state.

---

#### 2. Why PostgreSQL is the Industry Gold Standard for Secure Transactions
- **Serializable Snapshot Isolation (SSI)**: Detects write skew dependencies and automatically aborts conflicting transactions without table-wide read locks.
- **Robust Security Perimeter**: Supports SCRAM-SHA-256 password hashing, SSL/TLS wire encryption, Row-Level Security (RLS), and column-level encryption via \`pgcrypto\`.
- **Audit Trails**: Full transaction logging with \`pgaudit\` ensures every debit, credit, and administrative query is immutably logged for compliance.

#### 💡 Production Recommendation:
- Choose **PostgreSQL** for 95% of single-region or primary-replica financial transactional systems.
- Choose **CockroachDB** if your transaction volume requires horizontal multi-node scaling across multiple cloud data centers while preserving Serializable ACID.`,
      keyPoints: [
        'Relational databases with strict ACID compliance (PostgreSQL, CockroachDB, MySQL InnoDB) are mandatory for secure financial transactions.',
        'PostgreSQL with Serializable Snapshot Isolation (SSI) prevents double-spending and write skew anomalies without coarse table locks.',
        'For globally distributed cloud banking across multiple continents, Distributed NewSQL (CockroachDB / Spanner) uses Raft consensus and two-phase commit.',
        'Traditional NoSQL databases (BASE model) prioritize eventual consistency over strict durability and are unsuited for primary financial ledgers.',
      ],
      chartData: {
        type: 'bar',
        title: 'ACID Transaction Safety vs Concurrency Overhead Benchmark',
        labels: ['Read Committed (Fastest)', 'Repeatable Read', 'Serializable SSI (PostgreSQL)', 'Distributed 2PC (CockroachDB)'],
        values: [85000, 62000, 48000, 24000],
        datasetLabel: 'Transactions Per Second (TPS)',
      },
      subjectTag: 'computer_science',
      searchKeywords: ['secure transaction database', 'acid compliance postgresql', 'serializable snapshot isolation', 'financial database architecture'],
      slides: [
        {
          slideNumber: 1,
          title: 'Database Selection for Secure Transactions',
          subtitle: 'ACID Guarantees, Isolation Levels & Financial Integrity',
          layout: 'hero',
          badge: 'Database Architecture',
          keyConcept: 'Financial transactions demand strict ACID guarantees with Serializable isolation to eliminate dirty reads, race conditions, and double-spending.',
          bulletPoints: [
            { heading: 'PostgreSQL Dominance', description: 'Gold standard RDBMS featuring MVCC, Write-Ahead Logging (WAL), and Serializable Snapshot Isolation (SSI).', tag: 'ACID RDBMS' },
            { heading: 'Distributed NewSQL', description: 'CockroachDB & Spanner provide global multi-region distributed ACID via Raft consensus protocols.', tag: 'Distributed' },
            { heading: 'Why Not Pure NoSQL?', description: 'Eventual consistency (BASE) allows temporary state divergence unsuitable for immutable ledgers.', tag: 'Integrity' },
          ],
          processSteps: [],
          codeOrFormula: null,
          callout: {
            title: 'Gold Standard Rule',
            description: 'For banking and payments, always enforce PostgreSQL with Serializable isolation or CockroachDB with Raft consensus. Never use eventually consistent databases for monetary ledgers.',
            type: 'insight',
          },
        },
      ],
    };
  }

  // 4. Linux vs Windows / Operating Systems
  if (
    (q.includes('linux') && q.includes('windows')) ||
    (q.includes('os') && (q.includes('linux') || q.includes('windows')))
  ) {
    return {
      refinedPrompt:
        'Provide an in-depth operating systems comparative analysis between Linux and Microsoft Windows for B.Tech CSE students. Compare kernel architecture (Monolithic with loadable kernel modules vs Hybrid NT Microkernel), file system hierarchy (single unified root ext4 vs drive letters NTFS), process creation overhead (fork/clone with Copy-on-Write vs CreateProcess), server performance, and developer containerization ecosystem.',
      explanation: `### Architectural Analysis: Linux vs Microsoft Windows
      
The comparison between **Linux** and **Windows** represents a contrast between **Unix-philosophy open modularity** and an **integrated commercial desktop ecosystem**. Neither is universally "better"—the optimal choice depends strictly on whether your workload is **cloud/server infrastructure** or **desktop consumer productivity**.

| Architectural Dimension | Linux OS | Microsoft Windows |
| :--- | :--- | :--- |
| **Kernel Architecture** | Monolithic kernel (loadable kernel modules) | Hybrid microkernel (NT Kernel) |
| **File System Hierarchy** | Single unified root tree (\`/\`), case-sensitive (ext4, btrfs, ZFS) | Drive letter system (\`C:\\\`, \`D:\\\`), case-insensitive (NTFS) |
| **Resource Overhead** | Extremely lightweight (minimal server ~150-300MB RAM) | Heavier baseline footprint (idle desktop 2-4GB RAM) |
| **Process Model** | Lightweight \`fork()\` and \`clone()\` system calls with Copy-on-Write (CoW) | Heavyweight \`CreateProcess()\` API |
| **Package Management** | Native centralized managers (\`apt\`, \`pacman\`, \`dnf\`) | Historically manual \`.exe\`/\`.msi\` (now \`winget\`) |
| **Hardware Control & CLI** | Full root shell (\`bash\`, \`zsh\`), systemd, cron, ssh | GUI-first, PowerShell, Windows Terminal |
| **Dominant Domain** | 96%+ of cloud servers, supercomputers, Android, Docker/K8s | Enterprise desktops (Active Directory), Office, DirectX PC gaming |

#### 1. Kernel Architecture: Monolithic vs Hybrid
- **Linux Monolithic Kernel**: Core subsystems (scheduler, virtual memory, network stack, VFS, drivers) run in privileged **Kernel Space (Ring 0)**. Subsystems invoke each other directly via C function pointers, maximizing I/O bandwidth and packet throughput.
- **Windows NT Hybrid Kernel**: Combines microkernel abstraction with executive subsystem speed. Isolates drivers with the Hardware Abstraction Layer (\`HAL\`), offering resilience against faulty third-party graphics drivers at the cost of slight IPC message-passing overhead.

#### 2. Native Containerization vs Virtualization
- **Linux**: Docker containers run natively using kernel **Control Groups (\`cgroups\`)** and **Namespaces**. Containers are simply isolated host processes with zero virtualization overhead.
- **Windows**: To run Linux containers, Windows must virtualize a lightweight Linux kernel utility VM using **Hyper-V / WSL2** (Windows Subsystem for Linux).`,
      keyPoints: [
        'Linux uses a monolithic kernel with a single unified ext4/btrfs root; Windows uses a hybrid NT kernel with NTFS and drive letters.',
        'Docker and Kubernetes run natively on Linux kernel cgroups and namespaces with zero hypervisor penalty.',
        'Linux dominates 96%+ of cloud servers and top 500 supercomputers; Windows dominates enterprise corporate workstations and PC gaming.',
        'WSL2 provides a native Linux kernel running seamlessly alongside the Windows desktop environment.',
      ],
      chartData: {
        type: 'bar',
        title: 'Global Operating System Market Share by Workload (%)',
        labels: ['Public Cloud Servers (Linux)', 'Supercomputers (Linux)', 'Consumer Desktops (Windows)', 'Consumer Desktops (Linux)'],
        values: [96, 100, 72, 4],
        datasetLabel: 'Adoption Rate (%)',
      },
      subjectTag: 'computer_science',
      searchKeywords: ['linux vs windows', 'operating systems architecture', 'monolithic kernel vs hybrid kernel', 'linux for developers'],
      slides: [
        {
          slideNumber: 1,
          title: 'Linux vs Windows: Two Divergent OS Philosophies',
          subtitle: 'Unix modularity and open server control vs integrated commercial desktop ecosystem',
          layout: 'hero',
          badge: 'Operating Systems',
          keyConcept: 'Linux is built for headless server automation and developer control; Windows is built for unified desktop ergonomics and enterprise IT.',
          bulletPoints: [
            { heading: 'Unix Legacy', description: 'Everything is a file, modular CLI tools connected via standard I/O pipes.', tag: 'Philosophy' },
            { heading: 'NT Architecture', description: 'Centralized registry, COM object model, rich GUI, and backward binary compatibility.', tag: 'Architecture' },
            { heading: 'Market Reality', description: 'Linux owns the cloud backends and supercomputers; Windows owns corporate desktops.', tag: 'Ecosystem' },
          ],
          processSteps: [],
          codeOrFormula: null,
          callout: {
            title: 'Core Distinction',
            description: 'Linux treats processes and text streams as primitives; Windows treats GUI windows and security tokens as primitives.',
            type: 'insight',
          },
        },
        {
          slideNumber: 2,
          title: 'Process Creation: fork() + execve() vs CreateProcess()',
          subtitle: 'Comparing process spawning mechanics and memory duplication overhead',
          layout: 'process',
          badge: 'Kernel Mechanics',
          keyConcept: 'Linux fork() uses Copy-on-Write (CoW) to spawn processes in sub-milliseconds without copying memory pages.',
          bulletPoints: [
            { heading: 'Copy-on-Write', description: 'Child shares parent page tables until either process writes to a page.', tag: 'Memory' },
            { heading: 'Win32 Process Creation', description: 'CreateProcess() constructs tokens, handles, security descriptors, and PE loader mappings.', tag: 'Win32' },
          ],
          processSteps: [
            'Linux: fork() clones page tables with CoW ➔ child inherits file descriptors ➔ execve() swaps binary image',
            'Windows: CreateProcess() opens file ➔ creates kernel executive process object ➔ creates initial thread ➔ notifies Win32 subsystem',
          ],
          codeOrFormula: '// Linux process fork:\npid_t pid = fork();\nif (pid == 0) {\n    execve("/bin/ls", NULL, NULL);\n}',
          callout: {
            title: 'Performance Implication',
            description: 'Linux process spawning is 5-10x faster than Windows, making multi-process microservices highly efficient.',
            type: 'tip',
          },
        },
        {
          slideNumber: 3,
          title: 'File System Hierarchy & Disk Organization',
          subtitle: 'Unified VFS hierarchy vs Drive Letter Partitions',
          layout: 'deep_dive',
          badge: 'Storage Architecture',
          keyConcept: 'Linux mounts all physical and virtual devices under a single unified root (/); Windows assigns drive letters (C:\\, D:\\).',
          bulletPoints: [
            { heading: 'Linux POSIX Model', description: 'ext4 / btrfs / XFS case-sensitive tree. Virtual file systems like /proc and /sys expose kernel state.', tag: 'VFS' },
            { heading: 'Windows NTFS Model', description: 'Access Control Lists (ACLs), alternate data streams, case-insensitive paths, and drive volume mount points.', tag: 'NTFS' },
          ],
          processSteps: [],
          codeOrFormula: 'Linux: /var/log/nginx/access.log (Case Sensitive)\nWindows: C:\\Windows\\System32\\drivers (Case Insensitive)',
          callout: {
            title: 'Case-Sensitivity Invariant',
            description: 'In Linux, "File.txt" and "file.txt" are two distinct files. In Windows NTFS, they refer to the same inode.',
            type: 'warning',
          },
        },
        {
          slideNumber: 4,
          title: 'Empirical Adoption by Computing Domain',
          subtitle: 'Market dominance across cloud servers vs enterprise desktops',
          layout: 'chart',
          badge: 'Empirical Market',
          keyConcept: 'Notice the complete inversion: Linux owns 96%+ of cloud infrastructure, while Windows dominates desktops.',
          bulletPoints: [
            { heading: 'Server Infrastructure', description: 'Hyperscalers (AWS, GCP, Azure) run primarily on customized Linux kernels.', tag: 'Cloud' },
            { heading: 'Desktop Enterprise', description: 'Active Directory and Office 365 maintain Windows desktop dominance.', tag: 'Enterprise' },
          ],
          processSteps: [],
          codeOrFormula: null,
          callout: {
            title: 'Engineering Truth',
            description: 'Engineers write code on Windows/Mac desktops, but deploy and run that code on Linux production servers.',
            type: 'insight',
          },
        },
        {
          slideNumber: 5,
          title: 'Exam Cheat Sheet: Operating Systems Viva',
          subtitle: 'Crucial oral examination questions on Linux vs Windows',
          layout: 'takeaways',
          badge: 'Viva Voce',
          keyConcept: 'The 4 questions university examiners ask about operating system kernels.',
          bulletPoints: [
            { heading: 'Monolithic vs Microkernel?', description: 'Linux is monolithic with loadable kernel modules; Windows NT is a hybrid microkernel with Executive layers.', tag: 'Viva Q1' },
            { heading: 'Why is Linux preferred for Cloud?', description: 'Lightweight headless memory footprint, native cgroups/namespaces for Docker, and scriptable text configuration.', tag: 'Viva Q2' },
            { heading: 'How does Docker work on Windows?', description: 'Requires WSL2 running a virtualized Linux utility VM inside Hyper-V.', tag: 'Viva Q3' },
            { heading: 'What is Copy-on-Write (CoW)?', description: 'fork() shares memory pages between parent and child until a write operation triggers a page duplicate.', tag: 'Viva Q4' },
          ],
          processSteps: [],
          codeOrFormula: null,
          callout: {
            title: 'Viva Golden Rule',
            description: 'Never claim one is "better"; state their design goals: Linux for headless server throughput; Windows for rich interactive desktop integration.',
            type: 'tip',
          },
        },
      ],
    };
  }

  // 5. Linux Distributions for Gaming / Linux Gaming
  if (
    q.includes('distro') ||
    q.includes('distros') ||
    (q.includes('linux') && (q.includes('gaming') || q.includes('game') || q.includes('games') || q.includes('steam') || q.includes('best'))) ||
    q.includes('nobara') ||
    q.includes('bazzite') ||
    q.includes('steamos') ||
    q.includes('pop os') ||
    q.includes('pop_os') ||
    q.includes('pop!_os')
  ) {
    return {
      refinedPrompt:
        'Provide an in-depth systems engineering and comparative evaluation of the best Linux distributions for gaming (Nobara, Bazzite, SteamOS, Pop!_OS, Arch Linux). Detail the graphics translation pipeline (Wine, Proton, DXVK, VKD3D-Proton), custom low-latency kernel scheduler patches (fsync, futex2, EEVDF, BORE), display server protocols (Wayland with Gamescope HDR vs X11), driver management (Mesa RADV vs NVIDIA proprietary DKMS), and hardware compatibility benchmarks.',
      explanation: `### Comprehensive Systems Analysis: The Best Linux Distros for Gaming

In modern computer engineering, Linux gaming has undergone an architectural transformation. What used to require complex manual Wine prefixes is now a streamlined, high-performance ecosystem powered by **Valve Proton**, **Vulkan API translation**, and **custom low-latency kernel schedulers**. For most AAA titles, Linux gaming matches or even exceeds native Windows 11 performance by eliminating background OS telemetry and disk bloat.

| Gaming Distribution | Upstream Base | Target Use Case & Hardware | Custom Kernel & Scheduler | Graphics & Driver Stack |
| :--- | :--- | :--- | :--- | :--- |
| **Nobara Linux** | Fedora | Desktop PCs (AMD, NVIDIA, Intel) | Patched kernel (\`fsync\`, \`futex2\`, zen/bore scheduler) | Automated NVIDIA driver install, pre-configured Mesa, GStreamer codecs |
| **Bazzite** | Fedora Silverblue | Handhelds (Steam Deck, ROG Ally) & HTPCs | Custom gaming kernel with auto-rollback | Immutable atomic filesystem, Steam Gamepad UI (Gamescope session) |
| **Pop!_OS** | Ubuntu (System76) | Laptops with Hybrid GPUs & Beginners | System76 tuned kernel | Dedicated NVIDIA ISO, automatic discrete/integrated GPU power switching |
| **Arch Linux / EndeavourOS** | Independent Rolling | Enthusiasts & Advanced Builders | Optional \`linux-zen\` or \`linux-tkg\` kernels | Bleeding-edge Mesa Vulkan drivers, Arch User Repository (AUR) |

---

#### 1. The Direct3D to Vulkan Execution Pipeline
When a Windows game runs on Linux, it executes through a multi-tier runtime abstraction layer without code emulation:
1. **Application Call**: The Windows binary (\`.exe\`) invokes DirectX 11 or DirectX 12 graphics APIs.
2. **Win32 Translation (WINE / Proton)**: Win32 system calls (file I/O, audio, input, window management) are mapped directly into native POSIX system calls.
3. **API Translation (DXVK & VKD3D-Proton)**:
   - **DXVK** compiles Direct3D 9/10/11 draw calls into native **Vulkan** command buffers at runtime.
   - **VKD3D-Proton** translates Direct3D 12 state objects and shader pipelines into Vulkan pipeline states.
4. **Vulkan Driver Execution**: **Mesa RADV** (for AMD GPUs) or the NVIDIA driver translates Vulkan calls directly into GPU machine opcodes.

#### 2. Kernel Scheduling & Synchronization Invariants
- **Multi-thread Lock Contention**: Windows games use heavy multi-threaded event primitives. Standard Linux kernels had to simulate these through expensive kernel space roundtrips.
- **The \`fsync\` / \`futex2\` Revolution**: Custom gaming kernels implement \`fsync\` (fast user-space locking), allowing threads to wait on multiple synchronization primitives with a single system call. This removes frame-time spikes and micro-stuttering.
- **CPU Schedulers**: Gaming kernels leverage schedulers like **EEVDF** or **BORE** (Burst-Oriented Response Enhancer) to prioritize interactive game threads over background compiler or browser daemon tasks.

#### 3. Display Protocol: Wayland + Gamescope vs Legacy X11
Modern gaming distros default to **Wayland** paired with Valve's **Gamescope** micro-compositor:
- **Tear-Free Rendering**: Wayland enforces frame presentation without X11's legacy screen-tearing artifacts.
- **Compositor Upscaling & HDR**: Gamescope runs games in an isolated sandbox, applying AMD FidelityFX Super Resolution (FSR) or integer scaling and HDR tone mapping before outputting to the display.`,
      keyPoints: [
        'Nobara Linux is the premier out-of-the-box desktop choice with custom futex2 kernel patches and automated NVIDIA setup.',
        'Bazzite provides an immutable, console-like SteamOS experience ideal for gaming handhelds and living room PCs.',
        'The Proton pipeline translates DirectX 11/12 into native Vulkan (via DXVK & VKD3D) with negligible CPU overhead.',
        'Custom gaming kernels with fsync eliminate micro-stuttering in multi-threaded Windows game ports.',
      ],
      chartData: {
        type: 'bar',
        title: 'Gaming Performance Benchmark (% of Native Windows 11 FPS)',
        labels: ['Nobara Linux (Custom Kernel)', 'Bazzite (Gamescope Mode)', 'Arch Linux (Zen Kernel)', 'Pop!_OS (Mesa)', 'Ubuntu LTS (Default)'],
        values: [99.2, 98.6, 98.4, 96.1, 91.5],
        datasetLabel: 'FPS Relative to Windows 11 (%)',
      },
      subjectTag: 'computer_science',
      searchKeywords: ['best linux gaming distro', 'nobara linux gaming', 'bazzite vs steamos', 'proton gaming on linux'],
      slides: [
        {
          slideNumber: 1,
          title: 'The Modern Linux Gaming Renaissance: Architecture Overview',
          subtitle: 'How Proton, Vulkan, and custom kernels transformed Linux into a premier gaming platform',
          layout: 'hero',
          badge: 'Systems Architecture',
          keyConcept: 'Linux gaming is no longer emulation: Proton translates Direct3D draw calls into native Vulkan with 95-100% native performance.',
          bulletPoints: [
            { heading: 'The Proton Revolution', description: 'Valve open-source compatibility layer running over 15,000 Windows games out-of-the-box.', tag: 'Valve Proton' },
            { heading: 'Direct-to-Vulkan', description: 'DXVK and VKD3D bypass Windows DirectX runtimes, submitting hardware-accelerated Vulkan buffers.', tag: 'Vulkan API' },
            { heading: 'Zero Telemetry Overhead', description: 'Linux headless process architecture frees CPU cycles from background telemetry daemons.', tag: 'Low Overhead' },
          ],
          processSteps: [],
          codeOrFormula: null,
          callout: {
            title: 'Key Industry Insight',
            description: 'The Valve Steam Deck proves that an optimized Linux stack outperforms generic Windows installations on identical mobile APUs.',
            type: 'insight',
          },
        },
        {
          slideNumber: 2,
          title: 'Direct3D to Vulkan: The 4-Stage Translation Pipeline',
          subtitle: 'From Windows .exe binary to native GPU hardware draw calls',
          layout: 'process',
          badge: 'Execution Mechanics',
          keyConcept: 'Translation happens in user-space with near-zero latency, compiling DirectX shaders directly into SPIR-V Vulkan shaders.',
          bulletPoints: [
            { heading: 'Stage 1: Binary Launch', description: 'Steam launches the Windows executable in an isolated Proton Wine prefix.', tag: 'Win32' },
            { heading: 'Stage 2: API Interception', description: 'DXVK and VKD3D replace d3d11.dll / d3d12.dll libraries with Vulkan equivalents.', tag: 'DLL Hook' },
            { heading: 'Stage 3: Shader Compilation', description: 'DirectX HLSL shaders compile into SPIR-V Vulkan intermediate representations.', tag: 'SPIR-V' },
            { heading: 'Stage 4: GPU Execution', description: 'Mesa RADV or NVIDIA binary driver executes opcodes on the physical GPU.', tag: 'Hardware' },
          ],
          processSteps: [
            'Step 1: Game calls Direct3D 11/12 API functions',
            'Step 2: Proton Wine intercepts Win32 system & thread calls',
            'Step 3: DXVK / VKD3D compiles calls into native Vulkan shaders',
            'Step 4: Mesa / NVIDIA driver feeds hardware GPU command queues',
          ],
          codeOrFormula: 'DirectX 11/12 (HLSL) ➔ DXVK / VKD3D-Proton ➔ Vulkan (SPIR-V) ➔ Physical GPU',
          callout: {
            title: 'Asynchronous Shader Caching',
            description: 'Modern Mesa RADV compilers (ACO) compile shaders up to 10x faster than Windows compilers, eliminating in-game shader stutter.',
            type: 'tip',
          },
        },
        {
          slideNumber: 3,
          title: 'Top Gaming Distributions: Architectural Comparison',
          subtitle: 'Nobara vs Bazzite vs Pop!_OS vs Arch Linux',
          layout: 'comparison',
          badge: 'Distro Selection',
          keyConcept: 'Choose Nobara for standard desktops, Bazzite for handhelds/consoles, and Pop!_OS for hybrid-GPU laptops.',
          bulletPoints: [
            { heading: 'Nobara Linux', description: 'Fedora-based with Gloria (GloriousEggroll) kernel patches, fsync/futex2, and 1-click driver installers.', tag: 'Best Desktop' },
            { heading: 'Bazzite', description: 'Immutable Silverblue base with Gamescope Gamepad UI, auto-rollback, and Steam Deck parity.', tag: 'Best Handheld' },
            { heading: 'Pop!_OS', description: 'Ubuntu LTS foundation with dedicated NVIDIA ISO and bulletproof hybrid GPU graphics switching.', tag: 'Best Laptop' },
            { heading: 'Arch Linux', description: 'Rolling-release model with bleeding-edge Mesa drivers and the Arch User Repository (AUR).', tag: 'Power Users' },
          ],
          processSteps: [],
          codeOrFormula: null,
          callout: {
            title: 'Immutable Advantage',
            description: 'Bazzite uses rpm-ostree atomic updates: if a system upgrade ever introduces a glitch, you can boot into the previous state in 10 seconds.',
            type: 'insight',
          },
        },
        {
          slideNumber: 4,
          title: 'Gaming Performance: Frame Pacing & FPS vs Windows 11',
          subtitle: 'Quantitative benchmarks across gaming distributions relative to Windows 11 baseline',
          layout: 'chart',
          badge: 'Empirical Benchmark',
          keyConcept: 'Gaming-tuned Linux kernels reach 98-99% of native Windows FPS, often beating Windows on 1% low frame consistency.',
          bulletPoints: [
            { heading: 'Nobara & Bazzite Advantage', description: 'Patched kernels with fsync deliver virtually identical average frame rates to bare-metal Windows 11.', tag: '99% Parity' },
            { heading: '1% Low Stability', description: 'Linux thread scheduling often yields higher 1% low FPS by preventing Windows background CPU spikes.', tag: 'Frame Consistency' },
            { heading: 'Standard Distro Overhead', description: 'Stock Ubuntu without gaming kernel patches runs 5-8% slower due to conservative timer ticks.', tag: 'Stock Linux' },
          ],
          processSteps: [],
          codeOrFormula: null,
          callout: {
            title: 'Anti-Cheat Consideration',
            description: 'Games using kernel-level rootkit anti-cheat (e.g., Riot Vanguard in Valorant) will not run on Linux. Server-side anti-cheat (Easy Anti-Cheat, BattlEye) works when enabled by developers.',
            type: 'warning',
          },
        },
        {
          slideNumber: 5,
          title: 'Final Verdict: Which Gaming Distro Should You Install?',
          subtitle: 'Decision matrix based on your hardware and comfort level',
          layout: 'takeaways',
          badge: 'Decision Matrix',
          keyConcept: 'Match the distribution to your form factor and GPU manufacturer for a frictionless experience.',
          bulletPoints: [
            { heading: 'Standard Desktop (AMD / NVIDIA)', description: 'Install Nobara Linux. It handles proprietary drivers, codecs, and Wine dependencies automatically.', tag: 'Nobara' },
            { heading: 'Handheld (Deck, ROG Ally, Legion Go)', description: 'Install Bazzite. It provides sleep/resume, TDP controls, and the native SteamOS Gamepad UI.', tag: 'Bazzite' },
            { heading: 'Gaming Laptop with Switchable Graphics', description: 'Install Pop!_OS. Its system76-power utility seamlessly toggles Integrated, Hybrid, and Dedicated modes.', tag: 'Pop!_OS' },
            { heading: 'Custom DIY Hardware Enthusiast', description: 'Install Arch Linux with linux-zen or linux-tkg custom schedulers for maximum manual control.', tag: 'Arch Linux' },
          ],
          processSteps: [],
          codeOrFormula: null,
          callout: {
            title: 'Golden Rule for Beginners',
            description: 'Never install raw Debian or Ubuntu LTS for cutting-edge gaming: you need fresh Mesa Vulkan drivers (Mesa 24.3+) for day-one game launches.',
            type: 'tip',
          },
        },
      ],
    };
  }

  // 6. Rust Language: Why Rust is Fast / Memory Safety / Ownership
  if (
    q.includes('rust') &&
    !q.includes('rusting') && !q.includes('rust metal') && !q.includes('iron oxide')
  ) {
    return {
      refinedPrompt:
        'Provide a rigorous, in-depth technical explanation of why Rust is considered a high-performance systems programming language. Cover the ownership model and borrow checker (zero-cost memory safety at compile time), zero-cost abstractions, LLVM backend optimizations, absence of a garbage collector, fearless concurrency, and direct comparison against C, C++, and Go from a performance standpoint with benchmarks.',
      explanation: `### Why Rust is Fast: Zero-Cost Abstractions & Systems-Level Performance

**Rust** achieves **C/C++-equivalent native performance** while simultaneously eliminating entire classes of memory-safety bugs, with no runtime garbage collector tax. It is now the **most loved programming language in the Stack Overflow Developer Survey for 9 consecutive years** and powers Linux kernel drivers, the Firefox engine, Windows components, and AWS cloud infrastructure.

| Performance Dimension | Rust | C / C++ | Go | Java / JVM |
| :--- | :--- | :--- | :--- | :--- |
| **Garbage Collector** | **None** (Compile-time ownership) | None (Manual malloc/free) | Tri-color mark-sweep GC | Generational GC (Stop-the-World pauses) |
| **Memory Safety** | **Compile-time borrow checker** | Manual (buffer overflows, UAF) | Partial (GC prevents UAF) | GC-managed heap (no raw pointers) |
| **Runtime Overhead** | **Near-zero** | Near-zero | GC pause latency (~1-10ms) | JVM warm-up + GC pauses |
| **Thread Safety** | **Fearless Concurrency** (compile-time race detection) | Race conditions at runtime | \`sync\` primitives | \`synchronized\`, \`volatile\` |
| **Abstraction Cost** | **Zero-cost** (monomorphized generics) | Template instantiation (overhead at link time) | Runtime interface dispatch (vtable) | Virtual method dispatch (JVM bytecode) |
| **Binary Output** | Native ELF/PE binary (no VM required) | Native ELF/PE binary | Native binary + small Go runtime | JVM bytecode + JIT |

---

#### 1. The Ownership Model: Compile-Time Memory Management (No GC Required!)
Every value in Rust has exactly **one owner**. When ownership passes out of scope, the memory is **automatically freed** by the compiler inserting \`drop()\` calls at compile time — not at runtime.

\`\`\`rust
fn main() {
    let s1 = String::from("hello");  // s1 OWNS the heap allocation
    let s2 = s1;                      // Ownership MOVES to s2 (s1 is now invalid!)
    // println!("{}", s1);            // COMPILE ERROR: use after move!
    println!("{}", s2);              // OK: s2 owns the data
}  // s2 goes out of scope -> Rust inserts free(s2) automatically
\`\`\`

**Why this gives C-equivalent speed with no GC:** The allocator is called once at construction and once at drop — identical to what a disciplined C programmer writes manually. No garbage collection thread runs in the background, so there are **zero stop-the-world latency pauses**.

---

#### 2. The Borrow Checker: Zero-Cost Safety at Compile Time
The borrow checker enforces two invariants **at compile time** (zero runtime overhead):
1. You can have **either one mutable reference** OR **any number of shared (read-only) references** — never both simultaneously.
2. References must **never outlive** the data they point to (eliminates dangling pointers / use-after-free).

\`\`\`rust
fn main() {
    let mut v = vec![1, 2, 3];
    let r1 = &v;         // Immutable borrow OK
    let r2 = &v;         // Another immutable borrow OK
    // let rm = &mut v;  // COMPILE ERROR: cannot borrow as mutable while borrowed as immutable
    println!("{} {}", r1[0], r2[0]);
}
\`\`\`

---

#### 3. Zero-Cost Abstractions: Generics vs Java Interfaces
Rust generics are **monomorphized** at compile time — the compiler generates specialized code for every concrete type, eliminating virtual dispatch overhead:
\`\`\`rust
fn max<T: PartialOrd>(a: T, b: T) -> T {
    if a > b { a } else { b }
}
// At compile-time, Rust generates max_i32(), max_f64(), max_str() — each fully inlined
// No vtable lookup. No heap boxing. Pure direct function call. Zero overhead vs a hand-written version.
\`\`\`

---

#### 4. LLVM Backend Optimization
Rust compiles through **LLVM** (Low Level Virtual Machine), the same battle-tested optimizer used by Clang/C++ and Apple's Swift. LLVM applies:
- **Vectorization (SIMD)**: Automatically converts loops into AVX2/AVX-512 CPU vector instructions
- **Loop Unrolling**: Removes branch overhead in tight hot loops
- **Inlining & Dead Code Elimination**: Removes abstractions that add no cost
- **Link-Time Optimization (LTO)**: Cross-module inlining for maximum throughput

---

#### 5. Fearless Concurrency (Data-Race-Free by Compile Time)
Rust's type system **proves at compile time** that data races cannot occur:
- \`Send\` trait: a type is safe to transfer ownership across threads
- \`Sync\` trait: a type can be shared by reference across threads
If your code has a data race, it **does not compile**. Concurrency bugs that Go or C++ only expose at runtime under load are impossible to ship in Rust.`,
      keyPoints: [
        'Rust achieves C-equivalent performance with zero runtime garbage collection overhead.',
        'The borrow checker enforces memory safety at compile time: no use-after-free, no dangling pointers, no data races.',
        'Generic monomorphization produces zero-cost abstractions — no vtable dispatch, no boxing overhead.',
        'LLVM backend applies SIMD vectorization, inlining, loop unrolling, and LTO for optimal native code generation.',
        'Fearless Concurrency: Send and Sync traits make data races a compile-time error, not a production incident.',
      ],
      chartData: {
        type: 'bar',
        title: 'Relative Execution Speed Benchmark (Lower is Faster, C = 1.0x Baseline)',
        labels: ['Rust', 'C (clang)', 'C++ (clang)', 'Go', 'Java (JIT)', 'Python 3'],
        values: [1.01, 1.0, 1.02, 1.21, 1.52, 48.0],
        datasetLabel: 'Normalized Execution Time (×)',
      },
      subjectTag: 'computer_science',
      searchKeywords: ['why rust is fast', 'rust ownership model', 'rust vs c performance', 'rust borrow checker explained', 'rust zero cost abstractions'],
      slides: [
        {
          slideNumber: 1,
          title: 'Why Rust Is Fast: The Core Performance Architecture',
          subtitle: 'Zero GC overhead, compile-time safety, and LLVM native optimization',
          layout: 'hero',
          badge: 'Systems Performance',
          keyConcept: 'Rust achieves C-equivalent native speed because: (1) no GC runtime, (2) ownership-based memory management, (3) LLVM optimizer, (4) zero-cost generic monomorphization.',
          bulletPoints: [
            { heading: 'No Garbage Collector', description: 'Memory is freed deterministically at compile-time by the ownership system — no GC threads, no stop-the-world pauses.', tag: 'Zero GC' },
            { heading: 'Zero-Cost Abstractions', description: 'Generics, iterators, and closures compile to the same machine code as hand-written C. No runtime boxing or dispatch overhead.', tag: 'Monomorphization' },
            { heading: 'LLVM Backend', description: 'Passes through the same optimizing compiler backend as clang/C++: SIMD vectorization, loop unrolling, LTO, and dead-code elimination.', tag: 'LLVM Optimizer' },
          ],
          processSteps: [],
          codeOrFormula: null,
          callout: {
            title: 'Stack Overflow Record',
            description: 'Rust has been voted the "Most Loved Programming Language" in the Stack Overflow Developer Survey for 9 consecutive years due to its unique combination of safety and speed.',
            type: 'insight',
          },
        },
        {
          slideNumber: 2,
          title: 'Ownership & Borrow Checker: Safety Without Runtime Cost',
          subtitle: 'How compile-time memory tracking eliminates GC and undefined behavior',
          layout: 'process',
          badge: 'Memory Safety',
          keyConcept: 'Each value has exactly one owner. The borrow checker enforces safety invariants at compile time — zero runtime cost.',
          bulletPoints: [
            { heading: 'Single Owner Invariant', description: 'Each heap allocation has exactly one owner variable. When the owner goes out of scope, the allocator is called once to free it.', tag: 'Ownership' },
            { heading: 'Borrow Rules', description: 'Either one mutable &mut reference OR any number of shared & references — never both. Enforced at compile time by the borrow checker.', tag: 'Borrow Checker' },
            { heading: 'No Dangling Pointers', description: 'Lifetimes ensure no reference can ever outlive its owned data. Dangling pointers are a compile error.', tag: 'Lifetimes' },
          ],
          processSteps: [
            'Value is created: memory is allocated on stack or heap',
            'Ownership can be moved or borrowed (shared or mutable)',
            'Borrow checker verifies no aliasing violations or use-after-move at compile time',
            'When owner goes out of scope: drop() is inserted by compiler — deterministic deallocation',
          ],
          codeOrFormula: 'let s = String::from("hello"); // allocate\nlet r = &s;                   // borrow (safe)\nlet r2 = &mut s;             // ERROR: already borrowed!\n// s dropped here -> free() automatically',
          callout: {
            title: 'vs C++ Smart Pointers',
            description: 'C++ shared_ptr uses atomic reference-counting at runtime (costly increment/decrement on every copy). Rust ownership is tracked exclusively at compile time — zero runtime counter operations.',
            type: 'insight',
          },
        },
        {
          slideNumber: 3,
          title: 'Zero-Cost Abstractions & Generic Monomorphization',
          subtitle: 'Generics compile to specialized direct call code — no vtable, no boxing',
          layout: 'deep_dive',
          badge: 'Monomorphization',
          keyConcept: 'Rust generics are code-generated per concrete type at compile time, producing the same assembly as a hand-written specialized function.',
          bulletPoints: [
            { heading: 'vs Java Generics', description: 'Java generics use type erasure + heap boxing + vtable dispatch. Rust generics produce distinct binary copies per type with direct inlined calls.', tag: 'vs Java' },
            { heading: 'vs Go Interfaces', description: 'Go interface calls dispatch through a 2-pointer fat-pointer at runtime. Rust trait monomorphization emits a direct CALL instruction.', tag: 'vs Go' },
            { heading: 'Iterator Fusion', description: 'Rust iterators chain operations (map, filter, collect) which the compiler fuses into a single O(N) loop with no intermediate allocations.', tag: 'Iterators' },
          ],
          processSteps: [],
          codeOrFormula: '// This generic function:\nfn add<T: std::ops::Add>(a: T, b: T) -> T { a + b }\n// Produces TWO compiled functions:\n// add_i32(a: i32, b: i32) -> i32  { addl eax, edx }\n// add_f64(a: f64, b: f64) -> f64  { addsd xmm0, xmm1 }',
          callout: {
            title: 'Viva Question',
            description: 'What does "zero-cost abstraction" mean in Rust? It means the abstraction incurs ZERO additional runtime cost compared to the most optimal equivalent hand-written code.',
            type: 'tip',
          },
        },
        {
          slideNumber: 4,
          title: 'Benchmarks: Rust vs C vs Go vs Python',
          subtitle: 'Normalized execution time across compute-bound algorithmic workloads',
          layout: 'chart',
          badge: 'Performance Benchmark',
          keyConcept: 'Rust sits within 1% of optimized C/C++ across CPU-intensive workloads, while Go costs 20% and Python 48× overhead.',
          bulletPoints: [
            { heading: 'Rust ≈ C Speed', description: 'Rust consistently benchmarks within 1–3% of equivalent C/C++ across sorting, cryptography, and matrix operations.', tag: '1% Overhead' },
            { heading: 'Go GC Tax', description: 'Go benchmarks ~15–25% slower than Rust on CPU-bound workloads due to GC pause latency and runtime overhead.', tag: 'GC Pauses' },
            { heading: 'Python Interpreted', description: 'CPython executes 30–100× slower on numeric workloads due to interpreter loop and reference counting overhead.', tag: '48× Slower' },
          ],
          processSteps: [],
          codeOrFormula: null,
          callout: {
            title: 'Real-World Impact',
            description: 'Discord rewrote their Go read-states service in Rust and eliminated GC-induced latency spikes (p99 latency dropped from 10–50ms to under 1ms consistently).',
            type: 'insight',
          },
        },
        {
          slideNumber: 5,
          title: 'Fearless Concurrency & Production Adoption',
          subtitle: 'Data-race-free threading by compile-time proof + where Rust runs today',
          layout: 'takeaways',
          badge: 'Concurrency & Adoption',
          keyConcept: 'Send and Sync traits make data races a compile-time error. Used in Linux kernel, Firefox, Windows, AWS, Cloudflare, Discord, and npm.',
          bulletPoints: [
            { heading: 'Send Trait', description: 'A type implementing Send can be safely moved to another thread. Types wrapping raw pointers are !Send and cannot be shared.', tag: 'Thread Safety' },
            { heading: 'Sync Trait', description: 'A type implementing Sync can be shared by reference across threads. &T is Sync if T is Sync. Mutex<T> is Sync.', tag: 'Shared Refs' },
            { heading: 'Production Reality', description: 'Linux 6.1+ merged Rust for kernel drivers. Microsoft rewrites Windows components in Rust to eliminate memory CVEs. Cloudflare, AWS Lambda, and npm run on Rust.', tag: 'Production' },
          ],
          processSteps: [],
          codeOrFormula: null,
          callout: {
            title: 'Exam Cheat Sheet',
            description: 'Why is Rust fast? No GC + compile-time ownership + LLVM + monomorphized generics. Why is it safe? Borrow checker enforces aliasing rules + lifetimes prevent dangling pointers + Send/Sync prevent data races — all at compile time.',
            type: 'tip',
          },
        },
      ],
    };
  }

  // 6b. Recursion & Call Stack
  if (q.includes('recursion') || q.includes('recursive') || q.includes('call stack') || (q.includes('stack') && q.includes('overflow'))) {
    return {
      refinedPrompt:
        'Provide a detailed explanation of recursion, the call stack, and base case mechanics for B.Tech CSE students. Include stack frame structure, activation records, recursion trees, and tail-call optimization.',
      explanation: `### Recursion & The Call Stack: Deep Technical Breakdown

**Recursion** is a programming technique where a function calls itself with a smaller sub-problem until a **base case** terminates the chain. It is fundamental to Divide-and-Conquer algorithms, tree traversals, and dynamic programming.

#### Core Mechanism: The Call Stack
Every function call pushes an **activation record (stack frame)** onto the call stack:
- **Return Address**: Where to return execution after the function completes
- **Local Variables**: The function's private state (e.g. \`n\`, \`arr[low..high]\`)
- **Parameters**: Input arguments passed to the function

\`\`\`c
int factorial(int n) {       // factorial(4) called
    if (n == 0) return 1;   // Base Case: stack unwinds from here
    return n * factorial(n - 1); // Pushes new frame: factorial(3), factorial(2), factorial(1), factorial(0)
}
\`\`\`

| Stack Depth | Frame Contents |
| :--- | :--- |
| factorial(4) | n=4, waiting for factorial(3) |
| factorial(3) | n=3, waiting for factorial(2) |
| factorial(2) | n=2, waiting for factorial(1) |
| factorial(1) | n=1, waiting for factorial(0) |
| factorial(0) | **Base case** → returns 1 → stack unwinds upward |`,
      keyPoints: [
        'Each recursive call creates a new activation record (stack frame) on the call stack.',
        'Base case must be defined to prevent infinite recursion and StackOverflowError.',
        'Recursion depth is bounded by OS stack size (typically 1 MB to 8 MB).',
        'Tail recursion can be optimized by compilers to run in O(1) stack space.',
      ],
      chartData: null,
      subjectTag: 'computer_science',
      searchKeywords: ['recursion explained', 'call stack recursion', 'recursion vs iteration', 'base case recursion'],
      slides: [],
    };
  }

  // 7. Generic Dynamic Synthesis for All Other Questions
  // This is a LAST RESORT. The generic template text is useless — return a minimal stub
  // so generateStructuredAnswer always prefers the LLM or a specific KB entry above.
  const cleanTopic = extractCleanTopic(question);
  const tag = inferSubjectTag(question);

  return {
    refinedPrompt: `Provide an in-depth, structured university-level conceptual breakdown of "${question}". Detail core definitions, underlying architecture, practical applications, technical trade-offs, and real code examples where applicable.`,
    // Explanation intentionally minimal — if LLM is unavailable this displays, but it
    // won't have the misleading "Mastering..." generic key-points any more.
    explanation: `### ${cleanTopic.replace(/\b\w/g, (l) => l.toUpperCase())}: Technical Overview

This is a **${tag.replace('_', ' ')}** topic. Connect a custom LLM model in the **Model** settings (top nav) to get a detailed, context-rich explanation, slide deck, and viva preparation for this question.

#### What you asked:
> ${question}

---

**To get a full answer, configure your model:**
1. Click the **Model** button in the top navigation bar.
2. Select your provider (OpenAI, Gemini, Groq, Ollama, etc.)
3. Enter your API key and click **Save Configuration**.
4. Re-ask your question.`,
    keyPoints: [
      `Configure an LLM model to get a full technical breakdown of ${cleanTopic}.`,
      'Clario supports OpenAI, Google Gemini, Groq, DeepSeek, Anthropic Claude, and local Ollama models.',
      'Once connected, every question generates a full slide deck, charts, and viva preparation.',
    ],
    chartData: null,
    subjectTag: tag,
    searchKeywords: [cleanTopic, `${cleanTopic} explained`, `${cleanTopic} tutorial`],
    slides: [],
  };
};

/**
 * Step 1: Refine raw student question into a structured learning prompt
 */
export const refinePrompt = async (rawQuestion, customConfig = null) => {
  if (isGreetingOrCasual(rawQuestion)) {
    return 'User greeting & platform capabilities inquiry';
  }

  const systemPrompt = `You are an educational prompt engineering specialist for university engineering students.
Rewrite the student's question into a detailed, structured, context-rich learning prompt.
Add academic depth, grade-level hints (Undergraduate B.Tech level), specific aspects to cover, and guidance requesting visual data support.
Respond ONLY with the rewritten prompt text. Do not add conversational preamble or quotes.`;

  try {
    const text = await callLLM(systemPrompt, rawQuestion, 800, 25000, customConfig);
    if (text && text.trim().length > 10) {
      return text.trim().replace(/^["']|["']$/g, '');
    }
  } catch (err) {
    console.warn(`[LLM Refine Notice] External API call bypassed (${err.message}). Using local prompt engine.`);
  }

  const kb = getKnowledgeBaseAnswer(rawQuestion);
  return kb.refinedPrompt;
};

/**
 * Step 2: Generate structured answer (JSON) with explanation, key points, chart, subject tag, AND intelligent slides
 */
export const generateStructuredAnswer = async (refinedPrompt, rawQuestion = '', customConfig = null) => {
  // If it's a greeting or casual chat, return clean conversational response with NO slides or charts
  if (isGreetingOrCasual(rawQuestion) || isGreetingOrCasual(refinedPrompt)) {
    return getKnowledgeBaseAnswer('hi');
  }

  const systemPrompt = `You are Clario, an elite AI technical educator for B.Tech CSE university students.
Given the refined learning prompt, provide a comprehensive, pedagogically sound concept breakdown.

CRITICAL INSTRUCTION ON SLIDES & CHARTS:
- ONLY create slides and chartData when the query asks about a concrete technical concept, algorithm, system architecture, data structure, or comparison.
- If the query is a greeting, casual remark, or general small talk, you MUST set "slides": [] and "chartData": null, and provide a polite helpful response in "explanation".
- When teaching a complex concept, design 4 to 6 unique slides specifically tailored to the nuances of this concept (do NOT use generic placeholder text; make every slide title, bullet, step, and callout specific to this topic):
  * Slide 1 (layout "hero"): Concept hook, real-world intuition, high-level taxonomy
  * Slide 2 (layout "process"): Step-by-step execution mechanics, pipeline flow, or life cycle
  * Slide 3 (layout "deep_dive"): Technical breakdown, code or mathematical formulation, and critical invariant/danger zone
  * Slide 4 (layout "chart"): Visual empirical analysis discussing the quantitative chart metrics
  * Slide 5 (layout "takeaways"): High-yield exam revision, common viva traps, and mental models

You MUST respond strictly with valid raw JSON matching this exact schema:
{
  "explanation": "Detailed markdown explanation with headers (###), code blocks or equations if applicable, and deep concepts.",
  "keyPoints": ["Key point 1", "Key point 2", "Key point 3", "Key point 4"],
  "chartData": {
    "type": "bar" | "line" | "pie" | "doughnut",
    "title": "Chart Title",
    "labels": ["Label1", "Label2", "Label3", "Label4"],
    "values": [25, 50, 75, 100],
    "datasetLabel": "Metric"
  } | null,
  "subjectTag": "computer_science" | "mathematics" | "physics" | "biology" | "chemistry" | "economics" | "general_engineering",
  "searchKeywords": ["3 to 5 short topic keywords for video search (e.g. 'c vs python', 'c compilation process', 'python interpreter explained')"],
  "slides": [
    {
      "slideNumber": 1,
      "title": "Specific Engaging Title for this Slide",
      "subtitle": "Contextual subtitle explaining what this slide demonstrates",
      "layout": "hero" | "process" | "deep_dive" | "chart" | "takeaways",
      "badge": "Short badge tag (e.g. 'Core Intuition', 'Memory Stack', 'Complexity')",
      "keyConcept": "1-2 sentence core insight for this slide",
      "bulletPoints": [
        {
          "heading": "Point Headline",
          "description": "Clear conceptual detail specifically about this topic",
          "tag": "e.g. 'Rule', 'Analogy', 'LIFO', 'Invariant'"
        }
      ],
      "processSteps": [
        "Step 1: Specific step description...",
        "Step 2: Specific step description...",
        "Step 3: Specific step description..."
      ],
      "codeOrFormula": "Optional concise code snippet or formula relevant to this slide (or null)",
      "callout": {
        "title": "Crucial Invariant or Exam Trap",
        "description": "Important takeaway to remember",
        "type": "insight" | "warning" | "tip"
      }
    }
  ]
}

Do not surround output with markdown code ticks or any extra text. Output ONLY valid JSON.`;

  const visualizationTrace = detectAndGenerateVisualizationTrace(rawQuestion || refinedPrompt);

  try {
    const rawText = await callLLM(systemPrompt, refinedPrompt, 2200, 45000, customConfig);
    if (rawText && rawText.trim()) {
      let parsed = null;
      try {
        parsed = parseLlmJson(rawText);
      } catch (jsonErr) {
        console.warn(`[LLM Generate Notice] Could not parse strict JSON (${jsonErr.message}). Attempting direct extraction.`);
      }

      if (parsed && (parsed.explanation || parsed.content)) {
        const explanationText = parsed.explanation || parsed.content;
        const parsedSlides = sanitizeSlides(parsed.slides, rawQuestion);

        return {
          explanation: explanationText,
          keyPoints: Array.isArray(parsed.keyPoints)
            ? parsed.keyPoints
            : Array.isArray(parsed.keyTakeaways)
            ? parsed.keyTakeaways
            : [],
          chartData: sanitizeChartData(parsed.chartData),
          subjectTag: parsed.subjectTag || inferSubjectTag(rawQuestion || refinedPrompt),
          searchKeywords: sanitizeSearchKeywords(parsed.searchKeywords, rawQuestion || refinedPrompt),
          slides: parsedSlides,
          visualizationTrace,
        };
      }

      // If the model output markdown or plain text, DO NOT DISCARD IT! Use the model's actual answer!
      const cleanedText = rawText.replace(/```(?:json)?/gi, '').replace(/```/g, '').trim();
      if (cleanedText.length > 50) {
        const lines = cleanedText.split('\n');
        const bulletLines = lines
          .filter((l) => /^\s*[-*•\d+.]\s+/.test(l))
          .map((l) => l.replace(/^\s*[-*•\d+.]\s+/, '').trim())
          .filter((l) => l.length > 10 && l.length < 200)
          .slice(0, 4);

        return {
          explanation: cleanedText,
          keyPoints: bulletLines.length > 0 ? bulletLines : [
            'Architectural decisions must be evaluated against production trade-offs.',
            'Ensure boundary invariants and consistency requirements are strictly verified.',
          ],
          chartData: null,
          subjectTag: inferSubjectTag(rawQuestion || refinedPrompt),
          searchKeywords: sanitizeSearchKeywords([], rawQuestion || refinedPrompt),
          slides: [],
          visualizationTrace,
        };
      }
    }
  } catch (err) {
    console.warn(`[LLM Generate Notice] External API call error (${err.message}). Using fallback generator.`);
  }

  const kb = getKnowledgeBaseAnswer(rawQuestion || refinedPrompt);
  return {
    explanation: kb.explanation,
    keyPoints: kb.keyPoints,
    chartData: sanitizeChartData(kb.chartData),
    subjectTag: kb.subjectTag,
    searchKeywords: sanitizeSearchKeywords(kb.searchKeywords, rawQuestion || refinedPrompt),
    slides: sanitizeSlides(kb.slides, rawQuestion),
    visualizationTrace,
  };
};

/**
 * Step 3: Simplify explanation (ELI5 mode)
 */
export const simplifyExplanation = async (explanation, rawQuestion, customConfig = null) => {
  const systemPrompt = `You are a warm, engaging elementary school teacher and intuitive storyteller.
Explain the following concept like the user is 5 years old (ELI5).
Use simple everyday analogies (like toys, cooking, playgrounds, or games).
Avoid technical jargon.
Return a friendly, clear, intuitive 2-3 paragraph explanation.`;

  try {
    const text = await callLLM(
      systemPrompt,
      `Original question: ${rawQuestion}\n\nExplanation:\n${explanation}`,
      800,
      12000,
      customConfig
    );
    if (text && text.trim().length > 20) {
      return text.trim();
    }
  } catch (err) {
    console.warn(`[LLM Simplify Notice] Using local intuitive simplifier (${err.message}).`);
  }

  const q = (rawQuestion || '').toLowerCase();
  if (q.includes('c') && q.includes('python')) {
    return 'Imagine C is like building your own Formula 1 race car out of raw metal and screws: you have to build the engine yourself and change every tire by hand, but when it runs, it goes faster than lightning! Python is like a super-friendly electric self-driving car: you just press one button and tell it where to go, and it plays music and drives you safely. It is much easier to drive, even if a race car is faster on a racetrack!';
  }

  if (q.includes('recursion')) {
    return 'Imagine you stand between two mirrors in a funhouse, and you see smaller and smaller copies of yourself forever! In computer coding, recursion is like Russian Matryoshka nesting dolls: to open the big doll, you must open the doll inside it, then the next smaller one, until you reach the tiniest baby doll that cannot open anymore (that is your base case!). Then you put them all back together.';
  }

  return `Think of ${rawQuestion || 'this concept'} like building with colorful Lego bricks. Instead of worrying about giant complex blueprints, you start with one friendly brick at a time. Each piece connects to another simple piece, until suddenly you have built a whole magical castle! It is much simpler than it looks when you break it into small, playful steps.`;
};

/**
 * Step 4: Multi-turn Follow-up Answer Generator (ChatGPT style)
 */
export const generateFollowUpAnswer = async (followUpQuestion, history = [], rawOriginalQuestion = '', customConfig = null) => {
  const systemPrompt = `You are Clario, an elite AI technical tutor for B.Tech CSE university students.
You are in an interactive ChatGPT-style technical dialogue with a student.
Original conversation topic: "${rawOriginalQuestion}".

The student has asked a follow-up question:
"${followUpQuestion}"

Provide a direct, conversational, and pedagogically rich response.
- Format with markdown: use bold text, code blocks (with syntax tags like \`\`\`c, \`\`\`python), and bullet points.
- Address their exact question directly without fluff.
- If they ask for code examples, provide clean, runnable code with comments.
- If applicable, mention practical caveats or exam tips.

Respond strictly in valid JSON:
{
  "content": "Comprehensive markdown response with code blocks and explanations...",
  "keyTakeaways": ["Point 1", "Point 2"],
  "slides": []
}
Do not wrap JSON with extra text.`;

  try {
    const rawText = await callLLM(systemPrompt, followUpQuestion, 2000, 40000, customConfig);
    if (rawText && rawText.trim()) {
      let parsed = null;
      try {
        parsed = parseLlmJson(rawText);
      } catch (jsonErr) {
        console.warn(`[LLM FollowUp Notice] Could not parse strict JSON (${jsonErr.message}). Using raw model output.`);
      }

      if (parsed && (parsed.content || parsed.explanation)) {
        return {
          content: parsed.content || parsed.explanation,
          keyTakeaways: Array.isArray(parsed.keyTakeaways)
            ? parsed.keyTakeaways
            : Array.isArray(parsed.keyPoints)
            ? parsed.keyPoints
            : [],
          slides: sanitizeSlides(parsed.slides || []),
          chartData: sanitizeChartData(parsed.chartData),
        };
      }

      const cleanedText = rawText.replace(/```(?:json)?/gi, '').replace(/```/g, '').trim();
      if (cleanedText.length > 25) {
        return {
          content: cleanedText,
          keyTakeaways: [],
          slides: [],
          chartData: null,
        };
      }
    }
  } catch (err) {
    console.warn(`[LLM FollowUp Notice] Using fallback generator (${err.message}).`);
  }

  // Fallback intelligent answers for follow-ups
  const f = followUpQuestion.toLowerCase();
  const orig = (rawOriginalQuestion || '').toLowerCase();

  // Follow-up: When to use Mergesort over Quicksort
  if (
    (f.includes('mergesort') && (f.includes('quicksort') || f.includes('when') || f.includes('why') || f.includes('instead') || f.includes('prefer') || f.includes('use'))) ||
    (f.includes('when should i use') && (f.includes('merge') || f.includes('quick')))
  ) {
    return {
      content: `### When to Choose Mergesort Over Quicksort (Engineering Decision Framework)

In systems architecture and software engineering interviews, choosing between **Mergesort** and **Quicksort** is a classic case study in **guaranteed worst-case bounds vs average CPU cache throughput**.

---

#### 1. Decisive Scenarios: When You Must Use Mergesort

1. **Guaranteed $O(N \\log N)$ Worst-Case Latency Is Required (SLA / Safety-Critical Systems)**
   - Quicksort suffers from a pathological **$O(N^2)$ worst-case time** on poor pivot choices (e.g. already sorted data with naive partitioning, or adversarial inputs crafted to trigger Denial-of-Service).
   - Mergesort **strictly guarantees $O(N \\log N)$** comparisons regardless of initial data order. Use it in real-time avionics, medical systems, and latency-sensitive network services.

2. **Algorithmic Stability Is Mandatory (Multi-Column Database Sorting)**
   - Mergesort is **Stable**: two items with identical keys maintain their relative original input order.
   - Standard Quicksort is **Unstable**: pointer swaps displace identical elements across partitions.
   - *Example*: Sorting database records by \`Date\` first, then by \`Customer Name\`. Mergesort preserves the sub-ordering; Quicksort scrambles it.

3. **Sorting Linked Lists ($O(1)$ Extra Space Advantage!)**
   - On arrays, Mergesort requires $O(N)$ extra memory for the merge buffer.
   - But on singly or doubly **Linked Lists**, Mergesort can merge nodes simply by reconnecting pointers (\`next\` / \`prev\`) **in-place with $O(1)$ auxiliary space**!
   - Quicksort requires random memory access ($O(1)$ index lookup like \`arr[j]\`), which linked lists cannot provide ($O(N)$ traversal per index).

4. **External Sorting (Datasets Larger than Physical RAM)**
   - When sorting 500 GB of logs on a machine with 16 GB of RAM, data resides on disk blocks.
   - **External K-Way Merge Sort** streams contiguous chunks sequentially into RAM, sorts them, and merges them back to disk with sequential block I/O. Quicksort's random memory jumps cause catastrophic disk thrashing.

---

#### 2. When Should You Prefer Quicksort Instead?
- **In-Memory Arrays Where Memory Space Is Constrained**: Quicksort sorts **in-place** with only $O(\\log N)$ call-stack space, whereas array Mergesort consumes an extra $O(N)$ allocation buffer.
- **Raw CPU Performance**: Quicksort is **2x–3x faster** on modern CPU architectures due to sequential spatial cache locality in CPU L1/L2 caches and low constant comparison factors.

---

#### 💡 Summary viva cheat sheet:
| Criterion | Winner | Engineering Rationale |
| :--- | :--- | :--- |
| **Guaranteed Time Guarantee** | **Mergesort** | Guaranteed $O(N \\log N)$ vs Quicksort's $O(N^2)$ worst case |
| **Stability (preserves equal keys)** | **Mergesort** | Strictly preserves equal keys without extra comparator logic |
| **Sorting Linked Lists** | **Mergesort** | In-place node pointer rewiring with $O(1)$ extra memory |
| **External Disk Datasets** | **Mergesort** | Sequential stream access avoids random I/O thrashing |
| **In-Memory Arrays & Speed** | **Quicksort** | Zero auxiliary array allocation + superior CPU cache line reuse |`,
      keyTakeaways: [
        'Use Mergesort when guaranteed O(N log N) time bounds or algorithmic stability are required.',
        'Mergesort is the optimal choice for sorting Linked Lists because it rewires pointers in O(1) extra space.',
        'External Sorting for datasets larger than RAM relies on K-way Mergesort.',
        'Use Quicksort for in-memory arrays when memory footprint and raw CPU cache throughput dominate.',
      ],
      slides: [
        {
          slideNumber: 1,
          title: 'Mergesort vs Quicksort: Decision Matrix',
          subtitle: 'Architectural criteria for selecting the optimal sorting engine',
          layout: 'hero',
          badge: 'Production Decision',
          keyConcept: 'Mergesort wins on stability, worst-case latency guarantees, linked lists, and external datasets; Quicksort wins on in-memory array cache speed.',
          bulletPoints: [
            { heading: 'Guaranteed Worst-Case', description: 'Strict O(N log N) prevents adversarial DoS attacks and worst-case degradations.', tag: 'Safety' },
            { heading: 'Stability Preserved', description: 'Preserves order of equal keys across multi-column database sorting passes.', tag: 'Stable' },
            { heading: 'Linked Lists & External', description: 'O(1) extra space on linked lists and sequential block streaming for disk data.', tag: 'Streaming' },
          ],
          processSteps: [],
          codeOrFormula: null,
          callout: {
            title: 'Exam Invariant',
            description: 'Why is Mergesort preferred for linked lists? Because we can insert items in the middle and merge nodes in O(1) space by updating next pointers, without needing random array access.',
            type: 'insight',
          },
        },
      ],
      chartData: null,
    };
  }

  // Follow-up: Memory leak in C
  if (f.includes('memory leak') || (f.includes('leak') && f.includes('c'))) {
    return {
      content: `### Memory Leaks in C: Mechanism, Code Example & Detection

A **memory leak** occurs when dynamic memory is allocated on the heap via \`malloc()\`, \`calloc()\`, or \`realloc()\`, but the program loses all pointer references to that memory block without first calling \`free()\`.

Because C lacks an automatic garbage collector, the operating system kernel cannot reclaim that allocated virtual memory until the entire process terminates.

---

#### 1. Code Example: How a Memory Leak Happens

\`\`\`c
#include <stdio.h>
#include <stdlib.h>

void leakyFunction() {
    // Allocate 100 integers on the heap (400 bytes)
    int *buffer = (int *)malloc(100 * sizeof(int));

    if (buffer == NULL) {
        perror("Allocation failed");
        return;
    }

    buffer[0] = 42;
    printf("Value: %d\\n", buffer[0]);

    // BUG: Function returns without calling free(buffer)!
    // The local pointer variable 'buffer' on the call stack is popped,
    // but the 400 bytes on the heap remain allocated with no remaining reference.
}

int main() {
    for (int i = 0; i < 10000; i++) {
        leakyFunction(); // Leaks 400 bytes * 10,000 = ~4 MB of RAM!
    }
    printf("Loop complete. Memory was leaked!\\n");
    return 0;
}
\`\`\`

---

#### 2. The Correct Fix: Always Pair malloc with free

\`\`\`c
void safeFunction() {
    int *buffer = (int *)malloc(100 * sizeof(int));
    if (buffer == NULL) return;

    buffer[0] = 42;
    printf("Value: %d\\n", buffer[0]);

    // FIX: Reclaim heap memory before losing scope
    free(buffer);
    buffer = NULL; // Best practice: zero out pointer to prevent dangling pointer bugs
}
\`\`\`

---

#### 3. How to Detect Leaks with Valgrind

In Linux / B.Tech labs, use **Valgrind Memcheck**:
\`\`\`bash
gcc -g main.c -o app
valgrind --leak-check=full --show-leak-kinds=all ./app
\`\`\`
Valgrind intercepts all heap allocations and outputs:
\`\`\`text
==12345== HEAP SUMMARY:
==12345==     in use at exit: 4,000,000 bytes in 10,000 blocks
==12345==   definitely lost: 4,000,000 bytes in 10,000 blocks
\`\`\`

> 💡 **Viva Tip**: In C, every \`malloc()\` must have exactly one corresponding \`free()\`. Forgetting it creates a **memory leak**; calling \`free()\` twice creates a **double free** crash; accessing it after \`free()\` creates a **use-after-free** security vulnerability.`,
      keyTakeaways: [
        'Memory leaks occur when heap memory allocated with malloc() is never returned via free().',
        'In long-running daemon processes (like web servers or games), memory leaks eventually trigger Out-Of-Memory (OOM) kernel kills.',
        'Use Valgrind (valgrind --leak-check=full) during development to detect leaks before production.',
      ],
      slides: [],
    };
  }

  // Follow-up: Python GIL
  if (f.includes('gil') || f.includes('global interpreter lock')) {
    return {
      content: `### Deep Dive: Python's Global Interpreter Lock (GIL)

The **Global Interpreter Lock (GIL)** is a mutual-exclusion lock (mutex) used by the standard **CPython** implementation to prevent multiple native CPU threads from executing Python bytecodes simultaneously.

---

#### 1. Why Was the GIL Introduced?
CPython's memory management relies heavily on **Reference Counting** (\`ob_refcnt\` on every \`PyObject\`). Every time a variable is assigned or passed to a function:
\`\`\`c
Py_INCREF(obj); // increments refcount
Py_DECREF(obj); // decrements refcount
\`\`\`
If two threads increment or decrement this counter simultaneously without synchronization, race conditions would cause memory leaks or premature deallocation (segfaults). The GIL solves this with a single global lock around the interpreter loop.

---

#### 2. The Impact: CPU-Bound vs I/O-Bound

| Workload Type | Impact with Python Threads | Best Solution |
| :--- | :--- | :--- |
| **CPU-Bound** (Math, matrix multiplication, image processing) | **No speedup!** Multiple threads contend for the single GIL, often running slower due to lock contention context switches. | Use \`multiprocessing\` (spawns separate processes with independent memory spaces) or C extensions (NumPy). |
| **I/O-Bound** (Web scraping, database queries, file downloads) | **High speedup!** Threads release the GIL while waiting for network sockets or disk I/O. | Use \`threading\` or \`asyncio\` event loop. |

---

#### 3. Code Example: Threading vs Multiprocessing

\`\`\`python
import time
from concurrent.futures import ThreadPoolExecutor, ProcessPoolExecutor

def heavy_calculation(n):
    return sum(i * i for i in range(n))

N = 20_000_000

# 1. ThreadPool (Constrained by GIL - runs on ONLY 1 CPU core)
start = time.time()
with ThreadPoolExecutor(max_workers=4) as executor:
    list(executor.map(heavy_calculation, [N, N, N, N]))
print(f"Threads (GIL-limited): {time.time() - start:.2f}s")

# 2. ProcessPool (Bypasses GIL - runs across 4 distinct CPU cores!)
start = time.time()
with ProcessPoolExecutor(max_workers=4) as executor:
    list(executor.map(heavy_calculation, [N, N, N, N]))
print(f"Processes (True Multi-core): {time.time() - start:.2f}s")
\`\`\`

---

#### 4. The Future: Python 3.13 Free-Threaded Mode (PEP 703)
In **Python 3.13+**, Python introduced an experimental **No-GIL build** (\`python3.13t\`), replacing the global lock with fine-grained per-object locks and immortal objects, enabling true multi-threaded CPU scaling for the first time!`,
      keyTakeaways: [
        'The GIL ensures thread safety for CPython reference counting, but limits multi-threading to 1 core for CPU tasks.',
        'For CPU-intensive Python workloads, always use the multiprocessing module instead of threading.',
        'Python 3.13 introduces experimental PEP 703 to gradually phase out the GIL.',
      ],
      slides: [],
    };
  }

  // Follow-up: Pointers in C
  if (f.includes('pointer') || f.includes('pointers')) {
    return {
      content: `### Masterclass on Pointers in C

A **pointer** in C is simply a variable that stores the **virtual memory address** of another variable.

---

#### 1. The Two Key Operators: & and *

\`\`\`c
#include <stdio.h>

int main() {
    int score = 95;      // Normal integer variable
    int *ptr = &score;   // & = Address-of operator (gets memory address of score)

    printf("Value of score:        %d\\n", score);        // 95
    printf("Memory address of score: %p\\n", (void*)&score); // e.g., 0x7ffd5b6c
    printf("Pointer stores:          %p\\n", (void*)ptr);   // 0x7ffd5b6c
    printf("Dereferencing *ptr:     %d\\n", *ptr);         // * = Dereference operator -> 95

    // Modifying value via pointer:
    *ptr = 100;
    printf("New score value:        %d\\n", score);        // 100!
    return 0;
}
\`\`\`

---

#### 2. Why Pointers are Indispensable in C
1. **Pass-by-Reference in Functions**: C is strictly pass-by-value. Pointers allow functions to modify caller variables directly without copying large structures.
2. **Dynamic Memory Allocation**: \`malloc()\` returns a generic pointer (\`void *\`) to heap memory.
3. **Data Structures**: Linked lists, trees, graphs, and hash tables require pointer links between nodes.
4. **Direct Hardware Memory-Mapped I/O**: Embedded firmware writes directly to hardware device registers using fixed address pointers.

---

#### 3. Top 3 Pointer Pitfalls in C Exams

1. **Dangling Pointer**: Pointing to memory that has already been deallocated (\`free(ptr)\`).
2. **Null Pointer Dereference**: Accessing \`*ptr\` when \`ptr == NULL\` causes an instant OS \`Segmentation fault (core dumped)\`.
3. **Memory Leaks**: Overwriting a pointer variable before freeing the heap address it previously held.`,
      keyTakeaways: [
        'A pointer stores a memory address (typically 8 bytes on a 64-bit architecture).',
        '& gets the address of a variable; * dereferences a pointer to access or modify the underlying value.',
        'Always set pointers to NULL after freeing them to prevent dangerous dangling pointer bugs.',
      ],
      slides: [],
    };
  }

  // Follow-up: Which one to learn first / Competitive programming
  if (f.includes('learn first') || f.includes('which one') || f.includes('competitive programming')) {
    return {
      content: `### Which Should You Learn First: C or Python?

The choice depends directly on your immediate academic and engineering goals:

#### Learn **C** First If:
- You are a **B.Tech CSE student** taking Data Structures, Operating Systems, Computer Architecture, or Microprocessors.
- You want to build an intuitive mental model of how computer memory, the call stack, caches, and pointers work under the hood.
- You want to understand what higher-level languages are doing behind the scenes.
- **Verdict**: Learning C first makes you a substantially better software engineer, because it strips away all magical abstractions.

#### Learn **Python** First If:
- You want to build working projects quickly (Web apps, Discord bots, automation scripts).
- Your primary interest is **Artificial Intelligence, Machine Learning, or Data Science** (PyTorch, TensorFlow, Scikit-learn).
- You want to focus on high-level algorithms and logic without wrestling with memory management bugs or compilation errors.

---

#### For Competitive Programming (Codeforces, LeetCode):
- **C++ (STL)** is the gold standard (blazing execution speed like C, but with powerful Standard Template Library like vectors, maps, heaps).
- **Python** is excellent for rapid prototyping and mock interviews, but can occasionally hit Time Limit Exceeded (TLE) on strict time bounds.`,
      keyTakeaways: [
        'C teaches you how computers actually work; Python teaches you how to build applications quickly.',
        'Starting with C makes learning Python, JavaScript, and Java trivial later.',
        'For competitive programming, C++ with STL is the most widely favored language worldwide.',
      ],
      slides: [],
    };
  }

  // Follow-up: Linux vs Windows (Operating Systems Comparison)
  if (
    (f.includes('linux') && f.includes('windows')) ||
    ((f.includes('which is better') || f.includes('difference') || f.includes('compare')) && (f.includes('linux') || f.includes('windows')))
  ) {
    const kb = getKnowledgeBaseAnswer('linux vs windows');
    return {
      content: `### Operating System Architecture: Linux vs Microsoft Windows

The debate of **Linux vs Windows** comes down to **Unix-philosophy modularity and server control** versus **integrated commercial desktop ergonomics**. In computer science and engineering, neither is universally "better"—their architectures are optimized for completely different operational domains.

---

### 📊 Architectural Comparison Matrix

| Architectural Feature | Linux (Kernel + GNU Userland) | Microsoft Windows (Windows 11 / Server) |
| :--- | :--- | :--- |
| **Kernel Design** | **Monolithic Kernel** (drivers run in ring 0 with dynamic Loadable Kernel Modules \`LKM\`) | **Hybrid Kernel** (NT Kernel combining microkernel isolation with executive services) |
| **File System Model** | **Single unified root tree** (\`/\`), case-sensitive (\`ext4\`, \`btrfs\`, \`XFS\`, \`ZFS\`) | **Drive letter partitioning** (\`C:\\\`, \`D:\\\`), case-insensitive (\`NTFS\`, \`ReFS\`) |
| **Process Spawning** | Lightweight \`fork()\` and \`clone()\` system calls with Copy-on-Write (CoW) | Heavyweight Win32 \`CreateProcess()\` API with extensive state initialization |
| **Resource Footprint** | Extremely minimal (headless server boots in ~150 MB RAM with <1% CPU) | Heavier baseline footprint (idle desktop consumes 2.5–4.0 GB RAM) |
| **Configuration & Philosophy** | **"Everything is a file"**; plain text configs in \`/etc/\`, fully Git-trackable | Windows Registry (\`regedit\`), COM objects, and binary configuration databases |
| **Package Management** | Centralized dependency managers (\`apt\`, \`pacman\`, \`dnf\`, \`nix\`) | Historically manual \`.exe\` installers; modern \`winget\` / Chocolatey |
| **CLI & Automation** | Native POSIX shells (\`bash\`, \`zsh\`), pipeline streaming via pipes (\`|\`) | PowerShell (Object-oriented pipelines), CMD, Windows Terminal |
| **Primary Domains** | **96%+ of cloud servers**, AWS/GCP, Docker/K8s, supercomputers, Android | **Corporate enterprise desktops**, Active Directory, MS Office, PC Gaming |

---

#### 1. Kernel Architecture: Monolithic vs Hybrid
- **Linux Monolithic Kernel**: Core subsystems (scheduler, virtual memory, network stack, VFS, drivers) execute in privileged **Kernel Space (Ring 0)**. Subsystems invoke each other directly via C function pointers, maximizing I/O bandwidth and packet throughput.
- **Windows NT Hybrid Kernel**: Combines microkernel abstraction with executive subsystem speed. Isolates drivers with the Hardware Abstraction Layer (\`HAL\`), offering resilience against faulty third-party graphics drivers at the cost of slight IPC message-passing overhead.

---

#### 2. Why Developers & Servers Choose Linux
1. **Native Containerization (Docker / Kubernetes)**: Containers are not virtual machines—they are isolated Linux processes leveraging native kernel **Control Groups (\`cgroups\`)** for resource limits and **Namespaces** for process isolation.
2. **Headless Execution & Remote Management**: Production servers run headless (no graphical X11/Wayland display server), allowing 99.9% of machine hardware to be dedicated to databases, web APIs, or AI model training. Remote administration over secure \`ssh\` is standard.
3. **Total Inspectability & Open Source**: Every line of kernel source code is open. You can profile kernel scheduler latency using \`eBPF\`, \`perf\`, and \`ftrace\`.

---

#### 3. Why Desktops & Enterprise Choose Windows
1. **Universal Hardware & Consumer Driver Support**: OEMs, discrete GPUs (NVIDIA/AMD), Wi-Fi chipsets, and specialized hardware ship with certified WHQL Windows drivers.
2. **Enterprise Domain Identity**: Microsoft Active Directory (AD), Azure Entra ID, Group Policy Objects (GPO), and Intune manage millions of workstations globally with unified access control.
3. **Desktop Multimedia & DirectX**: Windows dominates PC gaming due to proprietary **DirectX 12** graphics APIs and kernel anti-cheat engines.

---

#### 💡 Viva Voce & Engineering Verdict
- **For Software Engineering, Cloud Backend, DevOps, and Embedded**: **Linux** is the industry standard.
- **For Everyday Productivity & Gaming**: **Windows** remains the most user-friendly desktop OS.
- **The Best Modern Hybrid**: Windows 11 with **WSL2 (Windows Subsystem for Linux)**, which runs a genuine Linux kernel virtualized inside Hyper-V alongside the Windows desktop!`,
      keyTakeaways: [
        'Linux uses a monolithic kernel with single root ext4; Windows uses a hybrid NT kernel with drive letters and NTFS.',
        'Docker containers run natively on Linux kernel primitives (namespaces & cgroups); Windows requires WSL2 virtualization.',
        'Linux dominates 96%+ of public cloud infrastructure; Windows dominates corporate enterprise desktops and PC gaming.',
        'WSL2 bridges the gap by running a real Linux kernel alongside Windows 11 desktop.',
      ],
      slides: kb.slides || [],
      chartData: kb.chartData || null,
    };
  }

  // Follow-up: Process vs Thread
  if (
    (f.includes('process') && f.includes('thread')) ||
    (f.includes('multithreading') && f.includes('multiprocessing'))
  ) {
    return {
      content: `### Operating Systems: Process vs Thread

A **Process** is an executing program instance with its own private virtual address space; a **Thread** is the smallest unit of execution *within* a process.

| Metric | Process | Thread (Lightweight Process) |
| :--- | :--- | :--- |
| **Address Space** | Isolated private virtual memory (Text, Data, Heap, Stack) | Shared memory space (Shares Text, Data, Heap with peer threads) |
| **Creation Cost** | Expensive (\`fork()\` duplicates page tables and file descriptors) | Fast (\`pthread_create()\` allocates small stack only) |
| **Context Switch Overhead** | High (Requires flushing TLB and switching page directory CR3) | Minimal (No MMU or TLB flush required; same address space) |
| **Inter-Communication** | Heavyweight Inter-Process Communication (\`IPC\`: pipes, sockets, shared memory) | Direct memory access (reading/writing shared heap variables) |
| **Fault Isolation** | High (Crash in one process does not affect others) | None (A segfault in one thread crashes the entire process!) |

---

#### 💡 Viva Rule of Thumb:
Use **Threads** for I/O concurrency and shared-memory tasks; use **Processes** when security isolation and fault tolerance are paramount.`,
      keyTakeaways: [
        'Threads share the heap and data segments of their parent process, but retain private stacks.',
        'A segfault in any thread terminates the entire host process.',
        'Switching threads is faster than switching processes because the CPU TLB cache remains valid.',
      ],
      slides: [],
    };
  }

  // Follow-up: Stack vs Heap
  if (f.includes('stack') && f.includes('heap')) {
    return {
      content: `### Memory Architecture: Stack vs Heap

In C and native programs, virtual memory is organized into distinct segments:

| Dimension | Stack Memory | Heap Memory |
| :--- | :--- | :--- |
| **Allocation Mechanism** | Automatic by CPU instruction pointer (\`sub rsp, N\`) | Manual by runtime allocator (\`malloc\`, \`new\`) |
| **Access Speed** | Blazing fast (cached in CPU L1 cache, sequential access) | Slower (requires pointer dereferencing and free list lookup) |
| **Lifetime** | Tied to function scope (LIFO unwinding upon return) | Persistent until explicitly freed (\`free()\` / garbage collector) |
| **Fragmentation** | Zero fragmentation (contiguous LIFO push/pop) | Prone to external memory fragmentation over long runtime |
| **Failure Mode** | \`StackOverflowError\` (recursion too deep or massive local array) | \`OutOfMemoryError\` / Heap allocation returns \`NULL\` |

---

#### 💡 Golden Rule:
Store small, fixed-size primitives on the **Stack**; store large or variable-length buffers on the **Heap**.`,
      keyTakeaways: [
        'Stack allocation is essentially instant (one CPU pointer adjustment).',
        'Heap allocation requires allocator book-keeping (free lists, binning) and can fragment.',
        'Stack memory is automatically reclaimed when functions return; heap memory requires manual free() in C.',
      ],
      slides: [],
    };
  }

  // Follow-up: Universal Comparison Matrix
  const cmp = parseComparisonEntities(followUpQuestion);
  if (cmp) {
    const { entityA, entityB } = cmp;
    const kb = getKnowledgeBaseAnswer(followUpQuestion);

    // If an authoritative knowledge base breakdown exists for this comparison, use it
    if (kb && kb.explanation && !isGreetingOrCasual(followUpQuestion)) {
      const isOrigCasual = isGreetingOrCasual(rawOriginalQuestion);
      return {
        content: `${!isOrigCasual ? `Following up on our discussion of **${rawOriginalQuestion}**:\n\n` : ''}${kb.explanation}`,
        keyTakeaways: kb.keyPoints || [],
        slides: (kb.slides && kb.slides.length > 0) ? kb.slides : [],
        chartData: kb.chartData || null,
      };
    }

    return {
      content: `### Architectural Analysis: ${entityA} vs ${entityB}

When evaluating **${entityA}** versus **${entityB}**, the decision depends on your engineering trade-offs between execution throughput, development speed, and architectural complexity.

---

### 📊 Comparative Matrix

| Architectural Dimension | ${entityA} | ${entityB} |
| :--- | :--- | :--- |
| **Primary Philosophy** | Focuses on specialized control and domain performance | Optimized for operational ergonomics and ecosystem integration |
| **Execution Paradigm** | Direct execution path with explicit resource lifecycle | Abstracted runtime layer managing baseline coordination |
| **Performance Profile** | Low latency, minimal runtime indirection | Balanced throughput with standardized higher-level abstractions |
| **Resource Efficiency** | Optimized for lean CPU & memory boundaries | Higher baseline footprint supporting runtime services |
| **Developer Ergonomics** | Requires deep mental model of underlying mechanics | Fast setup with rich tooling and extensive community packages |
| **Recommended Domain** | High-performance, latency-critical, or systems software | Enterprise scale, rapid product iteration, and maintainability |

---

#### 1. Core Architectural Distinctions
- **${entityA}**: Designed to give developers direct, deterministic control over data representations and execution pipelines. Trade-off: greater implementation effort and stricter boundary handling.
- **${entityB}**: Emphasizes developer velocity, battle-tested standard libraries, and automated resource handling. Trade-off: minimal abstraction overhead.

---

#### 💡 Engineering Decision Framework:
- Choose **${entityA}** when latency bounds, raw computational throughput, and tight hardware resource constraints dictate your architecture.
- Choose **${entityB}** when team velocity, rich standard libraries, and rapid feature delivery are paramount.`,
      keyTakeaways: [
        `Select ${entityA} when hardware throughput and fine-grained resource control are paramount.`,
        `Select ${entityB} when rapid engineering iteration and ecosystem support dominate requirements.`,
        'Always evaluate production architectural decisions using realistic workload benchmarks.',
      ],
      slides: (kb.slides && kb.slides.length > 0) ? kb.slides : [],
      chartData: kb.chartData || null,
    };
  }

  // General Technical Fallback
  const isOrigCasual = isGreetingOrCasual(rawOriginalQuestion);
  const cleanQ = extractCleanTopic(followUpQuestion);
  const kb = getKnowledgeBaseAnswer(followUpQuestion);

  // If knowledge base has an authoritative technical breakdown for this follow-up, use its full rich content, slides & charts!
  if (kb && kb.explanation && !isGreetingOrCasual(followUpQuestion)) {
    return {
      content: `${!isOrigCasual ? `Following up on our discussion of **${rawOriginalQuestion}**:\n\n` : ''}${kb.explanation}`,
      keyTakeaways: kb.keyPoints || [],
      slides: (kb.slides && kb.slides.length > 0) ? kb.slides : [],
      chartData: kb.chartData || null,
    };
  }

  return {
    content: `### Analysis: ${cleanQ.replace(/\b\w/g, (l) => l.toUpperCase())}

${!isOrigCasual ? `Following up on our discussion of **${rawOriginalQuestion}**:\n\n` : ''}When analyzing **${cleanQ}**, software engineers evaluate the underlying computational model, operational invariants, and production trade-offs.

---

#### 1. Core Computational Principles
- **State Integrity**: System invariants must be verified before executing state transitions to prevent race conditions or undefined behavior.
- **Resource Management**: Efficient architectures explicitly manage lifecycle boundaries—ensuring memory, file handles, and sockets are reclaimed immediately upon completion.
- **Latency vs Throughput**: Architectural choices balance synchronous immediate execution against asynchronous batched processing.

---

#### 2. Key Engineering Invariant
Always ensure boundary preconditions are strictly asserted before executing business logic. In university examinations and technical interviews, focus on explaining **why** an architecture works rather than merely reciting syntax.`,
    keyTakeaways: [
      `Understanding ${cleanQ} is essential for sound system design.`,
      'Always consider memory, latency, and fault isolation trade-offs.',
      'Verify boundary invariants to ensure deterministic runtime execution.',
    ],
    slides: (kb.slides && kb.slides.length > 0) ? kb.slides : [],
    chartData: kb.chartData || null,
  };
};

/**
 * Uses LLM to evaluate candidate YouTube Shorts and select the most relevant ones for the student's prompt
 */
export const curateShortsWithLLM = async (userPrompt, candidates) => {
  if (!candidates || candidates.length === 0) return [];
  if (candidates.length <= 3) return candidates;

  const candidateSummary = candidates.slice(0, 20).map((c) => ({
    videoId: c.videoId,
    title: c.title,
    channel: c.channel || 'YouTube Creator',
  }));

  const systemPrompt = `You are an expert educational content curator.
Given the student's prompt and a list of candidate YouTube Shorts found on YouTube, evaluate them for topic relevance, clarity, and educational value.
Select between 4 and 8 of the best, most relevant shorts that directly address the student's query.
Filter out unrelated memes, off-topic videos, or clickbait.
Return ONLY valid JSON matching this schema:
{"selectedVideoIds": ["id1", "id2", "id3", ...]}`;

  const userQuery = `Student Prompt: "${userPrompt}"\nCandidate Shorts:\n${JSON.stringify(candidateSummary, null, 2)}`;

  try {
    const rawText = await callLLM(systemPrompt, userQuery, 600, 20000);
    if (rawText) {
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (Array.isArray(parsed.selectedVideoIds) && parsed.selectedVideoIds.length > 0) {
          const candidateMap = new Map(candidates.map((c) => [c.videoId, c]));
          const selected = [];
          for (const id of parsed.selectedVideoIds) {
            if (candidateMap.has(id)) {
              selected.push(candidateMap.get(id));
              candidateMap.delete(id);
            }
          }
          if (selected.length >= 2) {
            return selected;
          }
        }
      }
    }
  } catch (err) {
    console.warn(`[LLM Shorts Curation Notice] ${err.message}. Using heuristic ranking.`);
  }

  // Graceful fallback: rank candidates by semantic keyword relevance to userPrompt
  const queryTokens = (userPrompt || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2);

  const scored = candidates.map((item) => {
    const titleLower = (item.title || '').toLowerCase();
    let score = 0;
    for (const token of queryTokens) {
      if (titleLower.includes(token)) score += 2;
    }
    return { item, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.map((s) => s.item).slice(0, 8);
};
