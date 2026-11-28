/**
 * Clario Interactive Algorithm Visualization Engine
 * Inspired by algorithm-visualizer.org
 * Generates step-by-step validated execution traces for:
 * - Sorting: Quicksort, Mergesort, Bubble Sort, Binary Search
 * - Recursion: Factorial & Fibonacci Call Stack
 * - Graphs: Breadth-First Search (BFS) & Depth-First Search (DFS)
 * - Trees: Binary Search Tree Insertion
 */

/**
 * Normalizes input array or returns default sample
 */
const getCleanArray = (customArray) => {
  if (Array.isArray(customArray) && customArray.length >= 3) {
    return customArray.slice(0, 10).map((v) => Number(v) || 0);
  }
  return [45, 12, 85, 32, 89, 39, 69, 22];
};

/**
 * 1. Quicksort Trace Generator (Lomuto Partition)
 */
export const generateQuicksortTrace = (customArray) => {
  const arr = getCleanArray(customArray);
  const steps = [];
  let stepCount = 1;

  const pseudocode = [
    'function quicksort(arr, low, high):',
    '  if low < high:',
    '    pi = partition(arr, low, high)',
    '    quicksort(arr, low, pi - 1)',
    '    quicksort(arr, pi + 1, high)',
    'function partition(arr, low, high):',
    '  pivot = arr[high], i = low - 1',
    '  for j = low to high - 1:',
    '    if arr[j] < pivot:',
    '      i++',
    '      swap(arr[i], arr[j])',
    '  swap(arr[i + 1], arr[high])',
    '  return i + 1',
  ];

  const callStack = [{ fn: 'quicksort', args: `low=0, high=${arr.length - 1}`, line: 1 }];

  // Step 0: Initial state
  steps.push({
    stepNumber: stepCount++,
    description: `Start Quicksort on array of ${arr.length} elements.`,
    codeLine: 0,
    state: {
      array: arr.map((val, idx) => ({ value: val, index: idx, status: 'default' })),
      pointers: { low: 0, high: arr.length - 1 },
      action: 'INIT',
      actionMessage: 'Array loaded for Quicksort.',
    },
    callStack: [...callStack],
  });

  const a = [...arr];

  const partition = (low, high) => {
    const pivot = a[high];
    let i = low - 1;

    steps.push({
      stepNumber: stepCount++,
      description: `Partitioning range [${low}..${high}]. Choosing pivot = ${pivot} at index ${high}.`,
      codeLine: 6,
      state: {
        array: a.map((val, idx) => ({
          value: val,
          index: idx,
          status: idx === high ? 'pivot' : idx >= low && idx < high ? 'subrange' : 'default',
        })),
        pointers: { low, high, pivot: high, i },
        action: 'PIVOT_SELECT',
        actionMessage: `Pivot set to ${pivot} at index ${high}.`,
      },
      callStack: [...callStack],
    });

    for (let j = low; j < high; j++) {
      steps.push({
        stepNumber: stepCount++,
        description: `Comparing arr[${j}] (${a[j]}) with pivot (${pivot}).`,
        codeLine: 8,
        state: {
          array: a.map((val, idx) => ({
            value: val,
            index: idx,
            status: idx === high ? 'pivot' : idx === j ? 'comparing' : idx <= i && idx >= low ? 'partitioned' : 'default',
          })),
          pointers: { low, high, pivot: high, i, j },
          action: 'COMPARE',
          actionMessage: `${a[j]} ${a[j] < pivot ? '<' : '>='} ${pivot}`,
        },
        callStack: [...callStack],
      });

      if (a[j] < pivot) {
        i++;
        if (i !== j) {
          const temp = a[i];
          a[i] = a[j];
          a[j] = temp;

          steps.push({
            stepNumber: stepCount++,
            description: `${a[i]} < ${pivot}: Swapping arr[${i}] (${temp}) with arr[${j}] (${a[i]}).`,
            codeLine: 10,
            state: {
              array: a.map((val, idx) => ({
                value: val,
                index: idx,
                status: idx === i || idx === j ? 'swapping' : idx === high ? 'pivot' : 'default',
              })),
              pointers: { low, high, pivot: high, i, j },
              action: 'SWAP',
              actionMessage: `Swapped arr[${i}] and arr[${j}].`,
            },
            callStack: [...callStack],
          });
        }
      }
    }

    // Place pivot in correct place
    const temp = a[i + 1];
    a[i + 1] = a[high];
    a[high] = temp;

    steps.push({
      stepNumber: stepCount++,
      description: `Placing pivot ${pivot} into its sorted position at index ${i + 1}.`,
      codeLine: 11,
      state: {
        array: a.map((val, idx) => ({
          value: val,
          index: idx,
          status: idx === i + 1 ? 'sorted' : idx === high ? 'swapping' : 'default',
        })),
        pointers: { low, high, pivot: i + 1 },
        action: 'PIVOT_SETTLED',
        actionMessage: `Pivot ${pivot} is now at final sorted index ${i + 1}.`,
      },
      callStack: [...callStack],
    });

    return i + 1;
  };

  const quicksort = (low, high) => {
    if (low < high) {
      callStack.push({ fn: 'quicksort', args: `low=${low}, high=${high}`, line: 2 });
      const pi = partition(low, high);
      quicksort(low, pi - 1);
      quicksort(pi + 1, high);
      callStack.pop();
    }
  };

  quicksort(0, a.length - 1);

  // Final sorted step
  steps.push({
    stepNumber: stepCount++,
    description: 'Quicksort completed. All elements are partitioned and sorted.',
    codeLine: 4,
    state: {
      array: a.map((val, idx) => ({ value: val, index: idx, status: 'sorted' })),
      pointers: {},
      action: 'DONE',
      actionMessage: 'Array is completely sorted.',
    },
    callStack: [],
  });

  return {
    algorithm: 'quicksort',
    title: 'Quicksort Algorithm Visualization',
    category: 'sorting',
    complexity: {
      timeBest: 'O(N log N)',
      timeAvg: 'O(N log N)',
      timeWorst: 'O(N²)',
      space: 'O(log N)',
    },
    pseudocode,
    initialState: { array: arr },
    steps,
  };
};

/**
 * 2. Mergesort Trace Generator (Divide and Conquer)
 */
export const generateMergeSortTrace = (customArray) => {
  const arr = getCleanArray(customArray);
  const steps = [];
  let stepCount = 1;

  const pseudocode = [
    'function mergesort(arr, low, high):',
    '  if low < high:',
    '    mid = floor((low + high) / 2)',
    '    mergesort(arr, low, mid)',
    '    mergesort(arr, mid + 1, high)',
    '    merge(arr, low, mid, high)',
    'function merge(arr, low, mid, high):',
    '  temp = [], i = low, j = mid + 1',
    '  while i <= mid and j <= high:',
    '    if arr[i] <= arr[j]: temp.push(arr[i++])',
    '    else: temp.push(arr[j++])',
    '  copy remaining and write temp back to arr[low..high]',
  ];

  const callStack = [{ fn: 'mergesort', args: `low=0, high=${arr.length - 1}`, line: 1 }];

  // Step 0: Initial state
  steps.push({
    stepNumber: stepCount++,
    description: `Start Mergesort on array of ${arr.length} elements (Divide & Conquer).`,
    codeLine: 0,
    state: {
      array: arr.map((val, idx) => ({ value: val, index: idx, status: 'default' })),
      pointers: { low: 0, high: arr.length - 1 },
      action: 'INIT',
      actionMessage: 'Array loaded for Mergesort.',
    },
    callStack: [...callStack],
  });

  const a = [...arr];

  const merge = (low, mid, high) => {
    callStack.push({ fn: 'merge', args: `low=${low}, mid=${mid}, high=${high}`, line: 5 });

    steps.push({
      stepNumber: stepCount++,
      description: `Merging sorted subarrays [${low}..${mid}] and [${mid + 1}..${high}].`,
      codeLine: 5,
      state: {
        array: a.map((val, idx) => ({
          value: val,
          index: idx,
          status: idx >= low && idx <= mid ? 'subrange' : idx > mid && idx <= high ? 'comparing' : 'default',
        })),
        pointers: { low, mid, high, i: low, j: mid + 1 },
        action: 'MERGE_START',
        actionMessage: `Combine left [${low}..${mid}] and right [${mid + 1}..${high}].`,
      },
      callStack: [...callStack],
    });

    const temp = [];
    let i = low;
    let j = mid + 1;

    while (i <= mid && j <= high) {
      const takeLeft = a[i] <= a[j];
      steps.push({
        stepNumber: stepCount++,
        description: `Comparing left arr[${i}] (${a[i]}) with right arr[${j}] (${a[j]}). Take ${takeLeft ? `left ${a[i]}` : `right ${a[j]}`}.`,
        codeLine: 9,
        state: {
          array: a.map((val, idx) => ({
            value: val,
            index: idx,
            status: idx === i || idx === j ? 'comparing' : idx >= low && idx <= high ? 'subrange' : 'default',
          })),
          pointers: { low, mid, high, i, j },
          action: 'COMPARE',
          actionMessage: `${a[i]} ${takeLeft ? '<=' : '>'} ${a[j]}`,
        },
        callStack: [...callStack],
      });

      if (takeLeft) {
        temp.push(a[i]);
        i++;
      } else {
        temp.push(a[j]);
        j++;
      }
    }

    while (i <= mid) {
      steps.push({
        stepNumber: stepCount++,
        description: `Append remaining left element arr[${i}] (${a[i]}) to merged buffer.`,
        codeLine: 11,
        state: {
          array: a.map((val, idx) => ({
            value: val,
            index: idx,
            status: idx === i ? 'subrange' : idx >= low && idx <= high ? 'subrange' : 'default',
          })),
          pointers: { low, mid, high, i },
          action: 'APPEND_LEFT',
          actionMessage: `Left remaining: ${a[i]}`,
        },
        callStack: [...callStack],
      });
      temp.push(a[i]);
      i++;
    }

    while (j <= high) {
      steps.push({
        stepNumber: stepCount++,
        description: `Append remaining right element arr[${j}] (${a[j]}) to merged buffer.`,
        codeLine: 11,
        state: {
          array: a.map((val, idx) => ({
            value: val,
            index: idx,
            status: idx === j ? 'subrange' : idx >= low && idx <= high ? 'subrange' : 'default',
          })),
          pointers: { low, mid, high, j },
          action: 'APPEND_RIGHT',
          actionMessage: `Right remaining: ${a[j]}`,
        },
        callStack: [...callStack],
      });
      temp.push(a[j]);
      j++;
    }

    // Write back to main array
    for (let k = 0; k < temp.length; k++) {
      a[low + k] = temp[k];
      const isFinalRange = low === 0 && high === a.length - 1;
      steps.push({
        stepNumber: stepCount++,
        description: `Write merged value ${temp[k]} back to arr[${low + k}].`,
        codeLine: 11,
        state: {
          array: a.map((val, idx) => ({
            value: val,
            index: idx,
            status: idx === low + k ? 'swapping' : idx >= low && idx <= high ? (isFinalRange ? 'sorted' : 'subrange') : 'default',
          })),
          pointers: { low, high, k: low + k },
          action: 'MERGE_WRITE',
          actionMessage: `arr[${low + k}] = ${temp[k]}`,
        },
        callStack: [...callStack],
      });
    }

    callStack.pop();
  };

  const mergesort = (low, high) => {
    if (low < high) {
      const mid = Math.floor((low + high) / 2);
      callStack.push({ fn: 'mergesort', args: `low=${low}, high=${high}`, line: 2 });

      steps.push({
        stepNumber: stepCount++,
        description: `Divide range [${low}..${high}] at mid=${mid} into [${low}..${mid}] and [${mid + 1}..${high}].`,
        codeLine: 2,
        state: {
          array: a.map((val, idx) => ({
            value: val,
            index: idx,
            status: idx >= low && idx <= high ? 'subrange' : 'default',
          })),
          pointers: { low, mid, high },
          action: 'DIVIDE',
          actionMessage: `Subarray [${low}..${high}] split at mid=${mid}.`,
        },
        callStack: [...callStack],
      });

      mergesort(low, mid);
      mergesort(mid + 1, high);
      merge(low, mid, high);

      callStack.pop();
    }
  };

  mergesort(0, a.length - 1);

  // Final step: sorted
  steps.push({
    stepNumber: stepCount++,
    description: 'Mergesort completed. All subarrays merged in guaranteed O(N log N) time.',
    codeLine: 5,
    state: {
      array: a.map((val, idx) => ({ value: val, index: idx, status: 'sorted' })),
      pointers: {},
      action: 'DONE',
      actionMessage: 'Array is completely sorted.',
    },
    callStack: [],
  });

  return {
    algorithm: 'mergesort',
    title: 'Mergesort Algorithm Visualization',
    category: 'sorting',
    complexity: {
      timeBest: 'O(N log N)',
      timeAvg: 'O(N log N)',
      timeWorst: 'O(N log N)',
      space: 'O(N)',
    },
    pseudocode,
    initialState: { array: arr },
    steps,
  };
};

/**
 * Quicksort vs Mergesort Comparison Trace
 */
export const generateSortingComparisonTrace = (customArray) => {
  const arr = getCleanArray(customArray);
  const quicksortTrace = generateQuicksortTrace(arr);
  const mergesortTrace = generateMergeSortTrace(arr);

  return {
    ...quicksortTrace,
    title: 'Quicksort vs Mergesort Execution & Complexity Comparison',
    comparison: {
      isComparison: true,
      title: 'Quicksort vs Mergesort Comparison',
      activeAlgorithm: 'quicksort',
      algorithms: [
        {
          id: 'quicksort',
          name: 'Quicksort',
          badge: 'In-Place Partitioning',
          timeAvg: 'O(N log N)',
          timeWorst: 'O(N²)',
          space: 'O(log N)',
          stable: false,
          paradigm: 'Divide & Conquer (Pivot Partitioning)',
          pros: 'Cache-friendly, zero auxiliary memory array needed',
          cons: 'Degrades to O(N²) on bad pivot choices (already sorted array)',
          trace: quicksortTrace,
        },
        {
          id: 'mergesort',
          name: 'Mergesort',
          badge: 'Guaranteed O(N log N)',
          timeAvg: 'O(N log N)',
          timeWorst: 'O(N log N)',
          space: 'O(N)',
          stable: true,
          paradigm: 'Divide & Conquer (Subarray Merging)',
          pros: 'Guaranteed O(N log N) worst-case, preserves relative order (stable)',
          cons: 'Requires O(N) additional auxiliary buffer memory',
          trace: mergesortTrace,
        },
      ],
    },
  };
};

/**
 * 3. Bubble Sort Trace Generator
 */
export const generateBubbleSortTrace = (customArray) => {
  const arr = getCleanArray(customArray);
  const a = [...arr];
  const steps = [];
  let stepCount = 1;

  const pseudocode = [
    'function bubbleSort(arr):',
    '  n = length(arr)',
    '  for i = 0 to n - 1:',
    '    for j = 0 to n - i - 2:',
    '      if arr[j] > arr[j + 1]:',
    '        swap(arr[j], arr[j + 1])',
  ];

  steps.push({
    stepNumber: stepCount++,
    description: `Initialize Bubble Sort with ${a.length} elements.`,
    codeLine: 0,
    state: {
      array: a.map((val, idx) => ({ value: val, index: idx, status: 'default' })),
      pointers: { i: 0, j: 0 },
      action: 'INIT',
      actionMessage: 'Starting pass 0.',
    },
  });

  const n = a.length;
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n - i - 1; j++) {
      steps.push({
        stepNumber: stepCount++,
        description: `Comparing arr[${j}] (${a[j]}) and arr[${j + 1}] (${a[j + 1]}).`,
        codeLine: 4,
        state: {
          array: a.map((val, idx) => ({
            value: val,
            index: idx,
            status: idx === j || idx === j + 1 ? 'comparing' : idx >= n - i ? 'sorted' : 'default',
          })),
          pointers: { i, j, 'j+1': j + 1 },
          action: 'COMPARE',
          actionMessage: `${a[j]} ${a[j] > a[j + 1] ? '>' : '<='} ${a[j + 1]}`,
        },
      });

      if (a[j] > a[j + 1]) {
        const temp = a[j];
        a[j] = a[j + 1];
        a[j + 1] = temp;

        steps.push({
          stepNumber: stepCount++,
          description: `${temp} > ${a[j]}: Swapping arr[${j}] and arr[${j + 1}].`,
          codeLine: 5,
          state: {
            array: a.map((val, idx) => ({
              value: val,
              index: idx,
              status: idx === j || idx === j + 1 ? 'swapping' : idx >= n - i ? 'sorted' : 'default',
            })),
            pointers: { i, j, 'j+1': j + 1 },
            action: 'SWAP',
            actionMessage: `Swapped ${temp} and ${a[j]}.`,
          },
        });
      }
    }
  }

  steps.push({
    stepNumber: stepCount++,
    description: 'Bubble sort complete! Every element is in its final sorted position.',
    codeLine: 1,
    state: {
      array: a.map((val, idx) => ({ value: val, index: idx, status: 'sorted' })),
      pointers: {},
      action: 'DONE',
      actionMessage: 'Array sorted.',
    },
  });

  return {
    algorithm: 'bubblesort',
    title: 'Bubble Sort Algorithm Visualization',
    category: 'sorting',
    complexity: {
      timeBest: 'O(N)',
      timeAvg: 'O(N²)',
      timeWorst: 'O(N²)',
      space: 'O(1)',
    },
    pseudocode,
    initialState: { array: arr },
    steps,
  };
};

/**
 * 3. Binary Search Trace Generator
 */
export const generateBinarySearchTrace = (customArray, target = 32) => {
  const raw = getCleanArray(customArray);
  const arr = [...new Set(raw)].sort((a, b) => a - b);
  const steps = [];
  let stepCount = 1;

  const pseudocode = [
    'function binarySearch(arr, target):',
    '  low = 0, high = length(arr) - 1',
    '  while low <= high:',
    '    mid = floor((low + high) / 2)',
    '    if arr[mid] === target: return mid',
    '    else if arr[mid] < target: low = mid + 1',
    '    else: high = mid - 1',
    '  return -1 // Not found',
  ];

  let low = 0;
  let high = arr.length - 1;
  let found = false;

  steps.push({
    stepNumber: stepCount++,
    description: `Binary search for target value ${target} in sorted array of ${arr.length} elements.`,
    codeLine: 1,
    state: {
      array: arr.map((val, idx) => ({ value: val, index: idx, status: 'default' })),
      pointers: { low, high },
      action: 'INIT',
      actionMessage: `Search range [${low}..${high}]. Target = ${target}`,
    },
  });

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);

    steps.push({
      stepNumber: stepCount++,
      description: `Calculate mid = floor((${low} + ${high}) / 2) = ${mid}. Inspect arr[${mid}] = ${arr[mid]}.`,
      codeLine: 3,
      state: {
        array: arr.map((val, idx) => ({
          value: val,
          index: idx,
          status: idx === mid ? 'comparing' : idx >= low && idx <= high ? 'subrange' : 'eliminated',
        })),
        pointers: { low, high, mid },
        action: 'INSPECT_MID',
        actionMessage: `Inspecting arr[${mid}] (${arr[mid]}) vs Target (${target})`,
      },
    });

    if (arr[mid] === target) {
      found = true;
      steps.push({
        stepNumber: stepCount++,
        description: `Target ${target} found at index ${mid}!`,
        codeLine: 4,
        state: {
          array: arr.map((val, idx) => ({
            value: val,
            index: idx,
            status: idx === mid ? 'sorted' : 'default',
          })),
          pointers: { mid },
          action: 'FOUND',
          actionMessage: `Found target ${target} at index ${mid}.`,
        },
      });
      break;
    } else if (arr[mid] < target) {
      steps.push({
        stepNumber: stepCount++,
        description: `arr[${mid}] (${arr[mid]}) < ${target}. Target is in right half. Set low = ${mid + 1}.`,
        codeLine: 5,
        state: {
          array: arr.map((val, idx) => ({
            value: val,
            index: idx,
            status: idx <= mid ? 'eliminated' : 'subrange',
          })),
          pointers: { low: mid + 1, high },
          action: 'DISCARD_LEFT',
          actionMessage: `Eliminated left half [${low}..${mid}].`,
        },
      });
      low = mid + 1;
    } else {
      steps.push({
        stepNumber: stepCount++,
        description: `arr[${mid}] (${arr[mid]}) > ${target}. Target is in left half. Set high = ${mid - 1}.`,
        codeLine: 6,
        state: {
          array: arr.map((val, idx) => ({
            value: val,
            index: idx,
            status: idx >= mid ? 'eliminated' : 'subrange',
          })),
          pointers: { low, high: mid - 1 },
          action: 'DISCARD_RIGHT',
          actionMessage: `Eliminated right half [${mid}..${high}].`,
        },
      });
      high = mid - 1;
    }
  }

  if (!found) {
    steps.push({
      stepNumber: stepCount++,
      description: `Target ${target} is not in the array (low > high).`,
      codeLine: 7,
      state: {
        array: arr.map((val, idx) => ({ value: val, index: idx, status: 'eliminated' })),
        pointers: {},
        action: 'NOT_FOUND',
        actionMessage: 'Search exhausted: target not found.',
      },
    });
  }

  return {
    algorithm: 'binary_search',
    title: 'Binary Search Algorithm Visualization',
    category: 'sorting',
    complexity: {
      timeBest: 'O(1)',
      timeAvg: 'O(log N)',
      timeWorst: 'O(log N)',
      space: 'O(1)',
    },
    pseudocode,
    initialState: { array: arr, target },
    steps,
  };
};

/**
 * 4. Recursion & Call Stack Trace Generator (Fibonacci / Factorial)
 */
export const generateRecursionTrace = (n = 4) => {
  const safeN = Math.max(1, Math.min(Number(n) || 4, 6));
  const steps = [];
  let stepCount = 1;

  const pseudocode = [
    'function fibonacci(n):',
    '  if n <= 1:',
    '    return n // Base case',
    '  a = fibonacci(n - 1)',
    '  b = fibonacci(n - 2)',
    '  return a + b',
  ];

  const callStack = [];

  const simulateFib = (val, caller = 'root') => {
    const frameId = `fib(${val})_${stepCount}`;
    callStack.push({ id: frameId, fn: 'fibonacci', arg: val, status: 'CALLING', depth: callStack.length + 1 });

    steps.push({
      stepNumber: stepCount++,
      description: `Call fibonacci(${val}). Pushing frame to stack (depth: ${callStack.length}).`,
      codeLine: 0,
      callStack: [...callStack],
      state: {
        activeArg: val,
        depth: callStack.length,
        action: 'PUSH_FRAME',
        actionMessage: `Entering fibonacci(${val}) from ${caller}`,
      },
    });

    if (val <= 1) {
      steps.push({
        stepNumber: stepCount++,
        description: `Base case reached: fibonacci(${val}) returns ${val}.`,
        codeLine: 2,
        callStack: [...callStack],
        state: {
          activeArg: val,
          returnValue: val,
          isBaseCase: true,
          action: 'BASE_CASE',
          actionMessage: `Base case! fib(${val}) = ${val}.`,
        },
      });

      const popped = callStack.pop();
      steps.push({
        stepNumber: stepCount++,
        description: `Popping fibonacci(${val}) from stack with return value ${val}.`,
        codeLine: 5,
        callStack: [...callStack],
        state: {
          returnedFrom: popped.fn,
          returnedValue: val,
          action: 'POP_FRAME',
          actionMessage: `Stack unwinding: returning ${val}`,
        },
      });
      return val;
    }

    // Call left branch: fib(n-1)
    const left = simulateFib(val - 1, `fib(${val}) left`);
    // Call right branch: fib(n-2)
    const right = simulateFib(val - 2, `fib(${val}) right`);

    const result = left + right;

    steps.push({
      stepNumber: stepCount++,
      description: `Compute fibonacci(${val}) = fib(${val - 1}) + fib(${val - 2}) = ${left} + ${right} = ${result}.`,
      codeLine: 5,
      callStack: [...callStack],
      state: {
        activeArg: val,
        leftResult: left,
        rightResult: right,
        returnValue: result,
        action: 'COMBINE',
        actionMessage: `Summed branches: ${left} + ${right} = ${result}`,
      },
    });

    callStack.pop();
    steps.push({
      stepNumber: stepCount++,
      description: `Popping fibonacci(${val}) from stack with total result ${result}.`,
      codeLine: 5,
      callStack: [...callStack],
      state: {
        returnedValue: result,
        depth: callStack.length,
        action: 'POP_FRAME',
        actionMessage: `Returning ${result} to caller.`,
      },
    });

    return result;
  };

  simulateFib(safeN);

  return {
    algorithm: 'recursion',
    title: 'Recursion Call Stack Visualization (Fibonacci)',
    category: 'recursion',
    complexity: {
      timeBest: 'O(2ⁿ)',
      timeAvg: 'O(2ⁿ)',
      timeWorst: 'O(2ⁿ)',
      space: 'O(N) (Call stack depth)',
    },
    pseudocode,
    initialState: { n },
    steps,
  };
};

/**
 * 5. Graph Traversal Trace Generator (Breadth-First Search)
 */
export const generateBFSTrace = () => {
  const steps = [];
  let stepCount = 1;

  const pseudocode = [
    'function BFS(graph, startNode):',
    '  queue = [startNode]',
    '  visited = {startNode}',
    '  while queue is not empty:',
    '    current = queue.shift()',
    '    for neighbor of graph[current]:',
    '      if neighbor not in visited:',
    '        visited.add(neighbor)',
    '        queue.push(neighbor)',
  ];

  const graph = {
    A: ['B', 'C'],
    B: ['A', 'D', 'E'],
    C: ['A', 'F'],
    D: ['B'],
    E: ['B', 'F'],
    F: ['C', 'E'],
  };

  const queue = ['A'];
  const visited = ['A'];

  steps.push({
    stepNumber: stepCount++,
    description: 'Initialize BFS with start node "A". Enqueue "A" and mark as visited.',
    codeLine: 1,
    state: {
      graphNodes: Object.keys(graph).map((node) => ({
        id: node,
        status: node === 'A' ? 'queued' : 'unvisited',
      })),
      queue: [...queue],
      visited: [...visited],
      action: 'INIT',
      actionMessage: 'Queue: [A] | Visited: {A}',
    },
  });

  while (queue.length > 0) {
    const current = queue.shift();

    steps.push({
      stepNumber: stepCount++,
      description: `Dequeue node "${current}". Inspect its outgoing neighbors.`,
      codeLine: 4,
      state: {
        graphNodes: Object.keys(graph).map((node) => ({
          id: node,
          status: node === current ? 'current' : visited.includes(node) ? 'visited' : queue.includes(node) ? 'queued' : 'unvisited',
        })),
        currentNode: current,
        queue: [...queue],
        visited: [...visited],
        action: 'DEQUEUE',
        actionMessage: `Processing node "${current}".`,
      },
    });

    const neighbors = graph[current] || [];
    for (const neighbor of neighbors) {
      if (!visited.includes(neighbor)) {
        visited.push(neighbor);
        queue.push(neighbor);

        steps.push({
          stepNumber: stepCount++,
          description: `Discovered unvisited neighbor "${neighbor}" from "${current}". Add to queue.`,
          codeLine: 8,
          state: {
            graphNodes: Object.keys(graph).map((node) => ({
              id: node,
              status: node === neighbor ? 'queued' : node === current ? 'current' : visited.includes(node) ? 'visited' : 'unvisited',
            })),
            currentNode: current,
            neighborNode: neighbor,
            queue: [...queue],
            visited: [...visited],
            action: 'ENQUEUE',
            actionMessage: `Enqueued "${neighbor}". Queue: [${queue.join(', ')}]`,
          },
        });
      }
    }
  }

  steps.push({
    stepNumber: stepCount++,
    description: 'BFS traversal complete! All reachable graph nodes have been explored.',
    codeLine: 3,
    state: {
      graphNodes: Object.keys(graph).map((node) => ({ id: node, status: 'visited' })),
      queue: [],
      visited: [...visited],
      action: 'DONE',
      actionMessage: 'Traversal finished.',
    },
  });

  return {
    algorithm: 'bfs',
    title: 'Breadth-First Search (BFS) Graph Visualization',
    category: 'graph',
    complexity: {
      timeBest: 'O(V + E)',
      timeAvg: 'O(V + E)',
      timeWorst: 'O(V + E)',
      space: 'O(V) (Queue storage)',
    },
    pseudocode,
    initialState: { startNode: 'A', graph },
    steps,
  };
};

/**
 * 6. Graph Traversal Trace Generator (Depth-First Search)
 */
export const generateDFSTrace = () => {
  const steps = [];
  let stepCount = 1;

  const pseudocode = [
    'function DFS(graph, startNode):',
    '  stack = [startNode]',
    '  visited = {}',
    '  while stack is not empty:',
    '    current = stack.pop()',
    '    if current not in visited:',
    '      visited.add(current)',
    '      for neighbor of reverse(graph[current]):',
    '        if neighbor not in visited:',
    '          stack.push(neighbor)',
  ];

  const graph = {
    A: ['B', 'C'],
    B: ['A', 'D', 'E'],
    C: ['A', 'F'],
    D: ['B'],
    E: ['B'],
    F: ['C'],
  };

  const stack = ['A'];
  const visited = [];

  steps.push({
    stepNumber: stepCount++,
    description: 'Initialize DFS with start node "A". Push "A" onto the traversal stack.',
    codeLine: 1,
    state: {
      graphNodes: Object.keys(graph).map((node) => ({
        id: node,
        status: node === 'A' ? 'stacked' : 'unvisited',
      })),
      stack: [...stack],
      visited: [...visited],
      action: 'INIT',
      actionMessage: 'Stack: [A] | Visited: {}',
    },
  });

  while (stack.length > 0) {
    const current = stack.pop();

    if (!visited.includes(current)) {
      visited.push(current);

      steps.push({
        stepNumber: stepCount++,
        description: `Popped node "${current}" from stack. Mark as visited.`,
        codeLine: 6,
        state: {
          graphNodes: Object.keys(graph).map((node) => ({
            id: node,
            status: node === current ? 'current' : visited.includes(node) ? 'visited' : stack.includes(node) ? 'stacked' : 'unvisited',
          })),
          currentNode: current,
          stack: [...stack],
          visited: [...visited],
          action: 'VISIT',
          actionMessage: `Visiting node "${current}".`,
        },
      });

      const neighbors = graph[current] || [];
      for (const neighbor of [...neighbors].reverse()) {
        if (!visited.includes(neighbor)) {
          stack.push(neighbor);

          steps.push({
            stepNumber: stepCount++,
            description: `Push unvisited neighbor "${neighbor}" onto stack.`,
            codeLine: 9,
            state: {
              graphNodes: Object.keys(graph).map((node) => ({
                id: node,
                status: node === neighbor ? 'stacked' : node === current ? 'current' : visited.includes(node) ? 'visited' : 'unvisited',
              })),
              currentNode: current,
              neighborNode: neighbor,
              stack: [...stack],
              visited: [...visited],
              action: 'PUSH_STACK',
              actionMessage: `Pushed "${neighbor}" to stack.`,
            },
          });
        }
      }
    }
  }

  steps.push({
    stepNumber: stepCount++,
    description: 'DFS traversal complete! Explored depth-first along connected components.',
    codeLine: 3,
    state: {
      graphNodes: Object.keys(graph).map((node) => ({ id: node, status: 'visited' })),
      stack: [],
      visited: [...visited],
      action: 'DONE',
      actionMessage: 'Traversal complete.',
    },
  });

  return {
    algorithm: 'dfs',
    title: 'Depth-First Search (DFS) Graph Visualization',
    category: 'graph',
    complexity: {
      timeBest: 'O(V + E)',
      timeAvg: 'O(V + E)',
      timeWorst: 'O(V + E)',
      space: 'O(V) (Stack depth)',
    },
    pseudocode,
    initialState: { startNode: 'A', graph },
    steps,
  };
};

/**
 * 7. CPU vs RAM / Memory Hierarchy Execution Trace
 */
export const generateCpuRamTrace = () => {
  const pseudocode = [
    '1. Disk Storage -> RAM: OS loads application bytecode and working data into volatile RAM',
    '2. Fetch: CPU Program Counter (PC) requests next instruction over memory bus from RAM address',
    '3. L1/L2 Cache Staging: High-speed SRAM caches instruction (0.5-1ns latency vs 60ns RAM)',
    '4. Decode: Control Unit decodes opcode (e.g. ADD R1, R2, R3)',
    '5. Execute: Arithmetic Logic Unit (ALU) computes result at gigahertz clock cycle (0.3ns)',
    '6. Write-Back: CPU writes updated state back to RAM working buffer',
    '7. Power Interruption Test: RAM capacitors drain (data lost); Disk non-volatile blocks remain intact',
  ];

  const steps = [
    {
      stepNumber: 1,
      description: 'Program is stored on persistent non-volatile disk. CPU cannot directly address disk storage at execution speeds.',
      codeLine: 0,
      state: {
        activeComponent: 'Storage Drive (SSD/HDD)',
        source: 'Storage Drive',
        target: 'RAM',
        busActive: true,
        actionMessage: 'Loading program instructions and working memory into RAM workspace',
        hardwareState: {
          cpu: { status: 'Idle', registers: { R1: 0, R2: 0, R3: 0 }, pc: '0x0000' },
          cache: { status: 'Empty', latency: '~1ns' },
          ram: { status: 'Loading', allocated: '64MB', latency: '~60ns', volatile: true },
          disk: { status: 'Reading', persistent: true, latency: '~100,000ns' },
        },
      },
    },
    {
      stepNumber: 2,
      description: 'Program now loaded into volatile RAM. RAM acts as the active scratchpad for fast read/write access.',
      codeLine: 1,
      state: {
        activeComponent: 'RAM',
        source: 'RAM',
        target: 'CPU Bus',
        busActive: true,
        actionMessage: 'CPU requests instruction at address 0x0040 over system bus',
        hardwareState: {
          cpu: { status: 'Fetching', registers: { R1: 0, R2: 0, R3: 0 }, pc: '0x0040' },
          cache: { status: 'Miss', latency: '~1ns' },
          ram: { status: 'Serving Address 0x0040', allocated: '64MB', latency: '~60ns', volatile: true },
          disk: { status: 'Idle', persistent: true, latency: '~100,000ns' },
        },
      },
    },
    {
      stepNumber: 3,
      description: 'CPU Cache stages the fetched line from RAM. L1 cache allows next instructions to be fetched with sub-nanosecond latency.',
      codeLine: 2,
      state: {
        activeComponent: 'L1/L2 Cache',
        source: 'RAM',
        target: 'CPU L1 Cache',
        busActive: false,
        actionMessage: 'Cached instruction line loaded into CPU on-die SRAM',
        hardwareState: {
          cpu: { status: 'Decoding', registers: { R1: 42, R2: 58, R3: 0 }, pc: '0x0040' },
          cache: { status: 'Hit (0.9ns)', latency: '~1ns' },
          ram: { status: 'Standby', allocated: '64MB', latency: '~60ns', volatile: true },
          disk: { status: 'Idle', persistent: true, latency: '~100,000ns' },
        },
      },
    },
    {
      stepNumber: 4,
      description: 'Control Unit decodes instruction: ADD R1, R2 -> R3. ALU executes calculation in ~0.3ns clock cycle.',
      codeLine: 4,
      state: {
        activeComponent: 'CPU (ALU & Registers)',
        source: 'Registers R1, R2',
        target: 'Register R3',
        busActive: false,
        actionMessage: 'ALU computes: 42 + 58 = 100 in CPU register R3',
        hardwareState: {
          cpu: { status: 'Executing ALU', registers: { R1: 42, R2: 58, R3: 100 }, pc: '0x0044' },
          cache: { status: 'Hit', latency: '~1ns' },
          ram: { status: 'Standby', allocated: '64MB', latency: '~60ns', volatile: true },
          disk: { status: 'Idle', persistent: true, latency: '~100,000ns' },
        },
      },
    },
    {
      stepNumber: 5,
      description: 'Write-Back: The calculated result in CPU register is written back to RAM address 0x0080 for application use.',
      codeLine: 5,
      state: {
        activeComponent: 'Memory Bus & RAM',
        source: 'CPU Register R3',
        target: 'RAM 0x0080',
        busActive: true,
        actionMessage: 'Writing result (100) back to RAM buffer over data bus',
        hardwareState: {
          cpu: { status: 'Writeback Complete', registers: { R1: 42, R2: 58, R3: 100 }, pc: '0x0048' },
          cache: { status: 'Dirty Line Flushed', latency: '~1ns' },
          ram: { status: 'Buffer Updated (Val: 100)', allocated: '64MB', latency: '~60ns', volatile: true },
          disk: { status: 'Idle', persistent: true, latency: '~100,000ns' },
        },
      },
    },
    {
      stepNumber: 6,
      description: 'Volatility Demonstration: Power loss cut. RAM capacitors instantly discharge; non-volatile disk retains all stored records.',
      codeLine: 6,
      state: {
        activeComponent: 'RAM vs Disk Volatility',
        source: 'Power Interruption',
        target: 'System State',
        busActive: false,
        actionMessage: 'RAM data wiped (volatile); Disk data preserved (non-volatile)',
        hardwareState: {
          cpu: { status: 'Powered Off', registers: { R1: 0, R2: 0, R3: 0 }, pc: '0x0000' },
          cache: { status: 'Lost (Volatile)', latency: 'N/A' },
          ram: { status: 'RESET / CLEARED (Volatile)', allocated: '0MB', latency: 'N/A', volatile: true },
          disk: { status: 'INTACT / PRESERVED (Non-Volatile)', persistent: true, latency: 'Preserved' },
        },
      },
    },
  ];

  return {
    algorithm: 'cpu_vs_ram',
    title: 'CPU Execution Cycle & RAM Architecture',
    category: 'Architecture & Systems',
    complexity: {
      time: 'CPU: ~0.3ns | L1: ~1ns | RAM: ~60ns | Disk: ~100,000ns',
      space: 'RAM: Volatile Working Buffer | Disk: Non-Volatile Storage',
      stable: true,
    },
    pseudocode,
    steps,
  };
};

/**
 * Detects if a question/prompt is asking about an algorithm or data structure
 * and generates the appropriate visualizer trace
 */
export const detectAndGenerateVisualizationTrace = (text = '') => {
  const t = typeof text === 'string' ? text.toLowerCase() : String(text || '').toLowerCase();

  // 0. Hardware / Architecture: CPU vs RAM, Memory Hierarchy, Cache
  if (
    (t.includes('cpu') && t.includes('ram')) ||
    t.includes('memory hierarchy') ||
    t.includes('hardware') ||
    t.includes('cache') ||
    t.includes('register')
  ) {
    return generateCpuRamTrace();
  }

  const isQuicksort = t.includes('quicksort') || t.includes('quick sort');
  const isMergesort = t.includes('mergesort') || t.includes('merge sort');

  // 1. Quicksort vs Mergesort Comparison Query
  if (isQuicksort && isMergesort) {
    return generateSortingComparisonTrace();
  }

  // 2. Quicksort
  if (isQuicksort) {
    return generateQuicksortTrace();
  }

  // 3. Mergesort
  if (isMergesort) {
    return generateMergeSortTrace();
  }

  // 4. Bubble Sort
  if (t.includes('bubble sort') || t.includes('bubblesort')) {
    return generateBubbleSortTrace();
  }

  // 5. Binary Search
  if (t.includes('binary search') && !t.includes('tree')) {
    return generateBinarySearchTrace();
  }

  // 6. Recursion / Fibonacci / Call Stack
  if (t.includes('recur') || t.includes('call stack') || t.includes('fibonacci') || t.includes('factorial')) {
    return generateRecursionTrace(4);
  }

  // 7. Breadth-First Search (BFS)
  if (t.includes('bfs') || t.includes('breadth first') || t.includes('breadth-first')) {
    return generateBFSTrace();
  }

  // 8. Depth-First Search (DFS)
  if (t.includes('dfs') || t.includes('depth first') || t.includes('depth-first')) {
    return generateDFSTrace();
  }

  // 9. General Sorting query (e.g. "how do sorting algorithms work", "compare sorting algorithms")
  if (t.includes('sort') || t.includes('array')) {
    return generateQuicksortTrace();
  }

  // 10. General Graph query
  if (t.includes('graph') || t.includes('traversal')) {
    return generateBFSTrace();
  }

  // 11. General Tree query
  if (t.includes('tree') || t.includes('bst')) {
    return generateBinarySearchTrace();
  }

  return null;
};
