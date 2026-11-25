import dotenv from 'dotenv';
import mongoose from 'mongoose';
import User from '../models/User.js';
import Question from '../models/Question.js';
import StudyList from '../models/StudyList.js';
import Feedback from '../models/Feedback.js';
import { connectDB, disconnectDB } from '../config/db.js';

dotenv.config();

export const seedData = async (shouldDisconnect = false) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      await connectDB();
    }

    // Clear existing collections
    await Promise.all([
      User.deleteMany({}),
      Question.deleteMany({}),
      StudyList.deleteMany({}),
      Feedback.deleteMany({}),
    ]);

    // 1. Create Users (Student, Teacher, Admin) with fixed IDs for session stability across dev restarts
    const studentPassword = await User.hashPassword('student123');
    const teacherPassword = await User.hashPassword('teacher123');
    const adminPassword = await User.hashPassword('admin123');

    const student = await User.create({
      _id: new mongoose.Types.ObjectId('660000000000000000000001'),
      name: 'Alex Rivera (Student)',
      email: 'student@clario.edu',
      passwordHash: studentPassword,
      role: 'student',
    });

    const student2 = await User.create({
      _id: new mongoose.Types.ObjectId('660000000000000000000004'),
      name: 'Maya Patel (Student)',
      email: 'maya@clario.edu',
      passwordHash: studentPassword,
      role: 'student',
    });

    const teacher = await User.create({
      _id: new mongoose.Types.ObjectId('660000000000000000000002'),
      name: 'Prof. Robert Chen (Teacher)',
      email: 'teacher@clario.edu',
      passwordHash: teacherPassword,
      role: 'teacher',
    });

    const admin = await User.create({
      _id: new mongoose.Types.ObjectId('660000000000000000000003'),
      name: 'System Admin',
      email: 'admin@clario.edu',
      passwordHash: adminPassword,
      role: 'admin',
    });

    // 2. Create Sample Questions with Rich Answers and Charts
    const q1 = await Question.create({
      userId: student._id,
      rawQuestion: 'explain recursion',
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
    });

    const q2 = await Question.create({
      userId: student._id,
      rawQuestion: 'what is photosynthesis',
      refinedPrompt:
        'Provide a biochemical and ecological explanation of photosynthesis suitable for higher education. Detail the light-dependent reactions within thylakoids, the Calvin cycle within the stroma, chemical equations, and a quantitative chart illustrating the rate of photosynthesis under varying light intensities.',
      explanation:
        '### Mechanism of Photosynthesis\n\nPhotosynthesis is the fundamental biological process through which photoautotrophs (plants, algae, and cyanobacteria) convert radiant solar energy into chemical energy stored in glucose bonds.\n\n$$\\text{6CO}_2 + 6\\text{H}_2\\text{O} + \\text{photons} \\longrightarrow \\text{C}_6\\text{H}_{12}\\text{O}_6 + 6\\text{O}_2$$\n\n#### Phase 1: Light-Dependent Reactions\nOccurring in the **thylakoid membranes** of chloroplasts, chlorophyll absorbs photons, exciting electrons through Photosystem II and I. Water is photolyzed, yielding oxygen byproduct, while ATP and NADPH are synthesized via photophosphorylation.\n\n#### Phase 2: Light-Independent Reactions (Calvin Cycle)\nIn the **stroma**, RuBisCO catalyzes carbon fixation by incorporating $\\text{CO}_2$ into ribulose 1,5-bisphosphate, subsequently reduced by ATP and NADPH to synthesize glyceraldehyde 3-phosphate (G3P), the precursor to glucose.',
      keyPoints: [
        'Light reactions convert light into chemical carriers (ATP & NADPH) while releasing oxygen.',
        'The Calvin cycle utilizes ATP and NADPH to fix inorganic carbon dioxide into sugars.',
        'RuBisCO is the rate-limiting enzyme governing carbon fixation.',
        'Photosynthetic rate plateaus at high light intensity due to enzyme saturation.',
      ],
      chartData: {
        type: 'bar',
        title: 'Photosynthetic Output (Rate) vs Light Intensity (lux)',
        labels: ['1k lux', '5k lux', '10k lux', '20k lux', '30k lux', '50k lux'],
        values: [12, 45, 78, 92, 98, 99],
        datasetLabel: 'Relative Rate of Photosynthesis (%)',
      },
      subjectTag: 'biology',
    });

    const q3 = await Question.create({
      userId: student2._id,
      rawQuestion: 'how does compound interest work',
      refinedPrompt:
        'Deliver a rigorous mathematical and financial breakdown of compound interest versus simple interest for engineering and finance students. Explain compounding frequency, exponential growth kinetics, Euler constant relationship in continuous compounding, and visual asset growth trajectory.',
      explanation:
        '### The Dynamics of Compound Interest\n\nCompound interest represents the accretion of interest not solely on the original principal sum, but also on the accumulated interest of preceding periods. It is the real-world embodiment of exponential mathematical growth.\n\n#### The Governing Formula\n$$A = P \\left(1 + \\frac{r}{n}\\right)^{nt}$$\nWhere:\n- $P$: Initial principal capital\n- $r$: Annual nominal interest rate (decimal)\n- $n$: Compounding frequency per year\n- $t$: Time horizon in years\n\n#### Continuous Compounding\nAs compounding frequency approaches infinity ($n \\to \\infty$), the formula transitions from discrete to continuous growth via Euler\'s number:\n$$A = P e^{rt}$$\n\nOver multi-decade intervals, compounding generates hyperbolic divergence from linear simple interest.',
      keyPoints: [
        'Interest earns interest, shifting balance growth from arithmetic to geometric progression.',
        'Higher compounding frequencies (daily vs annual) accelerate overall yield.',
        'Time in the market significantly out-weights initial principal size due to exponential curve acceleration.',
        'The Rule of 72 provides a rapid heuristic: $72 / r$ approximates balance doubling time.',
      ],
      chartData: {
        type: 'line',
        title: 'Principal Growth ($10,000 at 8% p.a.) Over 25 Years',
        labels: ['Year 0', 'Year 5', 'Year 10', 'Year 15', 'Year 20', 'Year 25'],
        values: [10000, 14693, 21589, 31721, 46609, 68484],
        datasetLabel: 'Portfolio Value ($)',
      },
      subjectTag: 'mathematics',
    });

    const q4 = await Question.create({
      userId: student._id,
      rawQuestion: 'compare quicksort and mergesort',
      refinedPrompt:
        'Compare QuickSort and MergeSort algorithms for B.Tech CSE students. Detail divide-and-conquer strategy, best/worst/average case time complexities, auxiliary space, stability, cache behavior, and empirical comparison operations.',
      explanation:
        '### QuickSort vs MergeSort: Comparative Algorithmic Analysis\n\nBoth algorithms employ the **Divide and Conquer** paradigm, yet differ substantially in where computational workload is concentrated:\n\n- **MergeSort**: Divides in $O(1)$ time, concentrates heavy work in the **Merge** phase ($O(n)$).\n- **QuickSort**: Spends work during the **Partition** phase ($O(n)$), with trivial $O(1)$ combination.\n\n#### Memory and Cache Locality\nQuickSort sorts *in-place* requiring only $O(\\log n)$ stack space. Its contiguous memory access grants superior CPU cache locality in practice. MergeSort requires $O(n)$ auxiliary memory, but guarantees consistent $O(n \\log n)$ time regardless of input distribution.',
      keyPoints: [
        'MergeSort offers guaranteed O(n log n) runtime and stability, but requires O(n) auxiliary memory.',
        'QuickSort is an in-place sort with excellent CPU cache locality, though worst-case is O(n^2).',
        'QuickSort is generally preferred for in-memory arrays; MergeSort excels for linked lists and external storage.',
      ],
      chartData: {
        type: 'bar',
        title: 'Memory Overhead (Auxiliary Space in KB for 100k items)',
        labels: ['QuickSort In-Place', 'MergeSort Auxiliary', 'HeapSort In-Place', 'BubbleSort In-Place'],
        values: [0.8, 800, 0.1, 0.1],
        datasetLabel: 'Auxiliary Memory (KB)',
      },
      subjectTag: 'computer_science',
    });

    // 3. Create Study Lists
    await StudyList.create({
      userId: student._id,
      name: 'Data Structures & Algorithms Prep',
      description: 'Core concepts for CS technical interviews and exams',
      questionIds: [q1._id, q4._id],
    });

    await StudyList.create({
      userId: student._id,
      name: 'Natural Sciences & Biology',
      description: 'Interdisciplinary science and biochemical mechanisms',
      questionIds: [q2._id],
    });

    // 4. Create Feedback Entries (Powers Teacher Dashboard)
    await Feedback.create([
      {
        userId: student._id,
        questionId: q1._id,
        rating: 5,
        comment: 'The call stack chart made the recursion stack overflow concept click instantly!',
      },
      {
        userId: student2._id,
        questionId: q1._id,
        rating: 5,
        comment: 'Crystal clear explanation of base cases and stack frames.',
      },
      {
        userId: student._id,
        questionId: q2._id,
        rating: 4,
        comment: 'Great breakdown of the Calvin cycle. The rate graph was very insightful.',
      },
      {
        userId: student2._id,
        questionId: q3._id,
        rating: 5,
        comment: 'Seeing the exponential curve over 25 years showed why compounding frequency matters.',
      },
      {
        userId: student._id,
        questionId: q4._id,
        rating: 5,
        comment: 'The memory overhead chart clearly explained why our professor favors QuickSort for arrays.',
      },
    ]);

    if (shouldDisconnect) {
      console.log('🎉 Seeding successfully completed!');
      console.log('\nDemo User Credentials:');
      console.log('----------------------------------------------------');
      console.log('Student: student@clario.edu / student123 (Alex Rivera)');
      console.log('Teacher: teacher@clario.edu / teacher123 (Prof. Robert Chen)');
      console.log('Admin:   admin@clario.edu   / admin123   (System Admin)');
      console.log('----------------------------------------------------\n');
      await disconnectDB();
      process.exit(0);
    }
  } catch (err) {
    console.error('Seeding error:', err);
    if (shouldDisconnect) process.exit(1);
    throw err;
  }
};

// If run from command line directly
if (process.argv[1] && process.argv[1].endsWith('seed.js')) {
  seedData(true);
}
