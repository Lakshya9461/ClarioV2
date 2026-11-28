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
 * 4. Insertion Sort Trace Generator
 */
export const generateInsertionSortTrace = (customArray) => {
  const arr = getCleanArray(customArray);
  const a = [...arr];
  const steps = [];
  let stepCount = 1;

  const pseudocode = [
    'function insertionSort(arr):',
    '  for i = 1 to length(arr) - 1:',
    '    key = arr[i]',
    '    j = i - 1',
    '    while j >= 0 and arr[j] > key:',
    '      arr[j + 1] = arr[j]',
    '      j = j - 1',
    '    arr[j + 1] = key',
  ];

  steps.push({
    stepNumber: stepCount++,
    description: `Initialize Insertion Sort on ${a.length} elements. First element arr[0]=${a[0]} is trivially sorted.`,
    codeLine: 0,
    state: {
      array: a.map((val, idx) => ({ value: val, index: idx, status: idx === 0 ? 'sorted' : 'default' })),
      pointers: { i: 1 },
      action: 'INIT',
      actionMessage: 'Ready for insertion pass 1.',
    },
    callStack: [{ fn: 'insertionSort', args: `n=${a.length}`, line: 1 }],
  });

  const n = a.length;
  for (let i = 1; i < n; i++) {
    const key = a[i];
    let j = i - 1;

    steps.push({
      stepNumber: stepCount++,
      description: `Picking arr[${i}] (${key}) as key to insert into sorted prefix [0..${i - 1}].`,
      codeLine: 2,
      state: {
        array: a.map((val, idx) => ({
          value: val,
          index: idx,
          status: idx === i ? 'pivot' : idx < i ? 'sorted' : 'default',
        })),
        pointers: { i, j, key: i },
        action: 'SELECT_KEY',
        actionMessage: `Key to insert = ${key}.`,
      },
      callStack: [{ fn: 'insertionSort', args: `inserting i=${i}, key=${key}`, line: 2 }],
    });

    while (j >= 0 && a[j] > key) {
      steps.push({
        stepNumber: stepCount++,
        description: `arr[${j}] (${a[j]}) > key (${key}): Shifting ${a[j]} right to index ${j + 1}.`,
        codeLine: 5,
        state: {
          array: a.map((val, idx) => ({
            value: val,
            index: idx,
            status: idx === j ? 'comparing' : idx === j + 1 ? 'swapping' : idx < i ? 'sorted' : 'default',
          })),
          pointers: { i, j, key: i },
          action: 'SHIFT',
          actionMessage: `Shift ${a[j]} to index ${j + 1}.`,
        },
        callStack: [{ fn: 'insertionSort', args: `shifting j=${j}`, line: 5 }],
      });

      a[j + 1] = a[j];
      j--;
    }

    a[j + 1] = key;

    steps.push({
      stepNumber: stepCount++,
      description: `Inserted key (${key}) at position ${j + 1}. Prefix [0..${i}] is now sorted.`,
      codeLine: 7,
      state: {
        array: a.map((val, idx) => ({
          value: val,
          index: idx,
          status: idx <= i ? 'sorted' : 'default',
        })),
        pointers: { i, insertPos: j + 1 },
        action: 'INSERT_DONE',
        actionMessage: `Placed ${key} at index ${j + 1}.`,
      },
      callStack: [{ fn: 'insertionSort', args: `inserted at ${j + 1}`, line: 7 }],
    });
  }

  steps.push({
    stepNumber: stepCount++,
    description: 'Insertion Sort completed. Entire array is sorted in-place.',
    codeLine: 7,
    state: {
      array: a.map((val, idx) => ({ value: val, index: idx, status: 'sorted' })),
      pointers: {},
      action: 'DONE',
      actionMessage: 'All elements sorted in-place.',
    },
    callStack: [],
  });

  return {
    algorithm: 'insertionsort',
    title: 'Insertion Sort Algorithm Visualization',
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
 * 5. Selection Sort Trace Generator
 */
export const generateSelectionSortTrace = (customArray) => {
  const arr = getCleanArray(customArray);
  const a = [...arr];
  const steps = [];
  let stepCount = 1;

  const pseudocode = [
    'function selectionSort(arr):',
    '  n = length(arr)',
    '  for i = 0 to n - 2:',
    '    minIdx = i',
    '    for j = i + 1 to n - 1:',
    '      if arr[j] < arr[minIdx]: minIdx = j',
    '    if minIdx != i: swap(arr[i], arr[minIdx])',
  ];

  steps.push({
    stepNumber: stepCount++,
    description: `Initialize Selection Sort with ${a.length} elements.`,
    codeLine: 0,
    state: {
      array: a.map((val, idx) => ({ value: val, index: idx, status: 'default' })),
      pointers: { i: 0 },
      action: 'INIT',
      actionMessage: 'Starting pass 0 to find minimum.',
    },
    callStack: [{ fn: 'selectionSort', args: `n=${a.length}`, line: 1 }],
  });

  const n = a.length;
  for (let i = 0; i < n - 1; i++) {
    let minIdx = i;

    steps.push({
      stepNumber: stepCount++,
      description: `Pass ${i + 1}: Find minimum element in unsorted range [${i}..${n - 1}]. Initial min is arr[${i}] (${a[i]}).`,
      codeLine: 3,
      state: {
        array: a.map((val, idx) => ({
          value: val,
          index: idx,
          status: idx < i ? 'sorted' : idx === minIdx ? 'pivot' : 'default',
        })),
        pointers: { i, minIdx },
        action: 'SET_MIN',
        actionMessage: `Current min = arr[${minIdx}] (${a[minIdx]}).`,
      },
      callStack: [{ fn: 'selectionSort', args: `pass i=${i}`, line: 3 }],
    });

    for (let j = i + 1; j < n; j++) {
      const isNewMin = a[j] < a[minIdx];

      steps.push({
        stepNumber: stepCount++,
        description: `Comparing arr[${j}] (${a[j]}) with current min arr[${minIdx}] (${a[minIdx]}). ${
          isNewMin ? `New minimum found: ${a[j]}!` : `${a[j]} >= ${a[minIdx]}, keep current min.`
        }`,
        codeLine: 5,
        state: {
          array: a.map((val, idx) => ({
            value: val,
            index: idx,
            status: idx < i ? 'sorted' : idx === minIdx ? 'pivot' : idx === j ? 'comparing' : 'default',
          })),
          pointers: { i, j, minIdx },
          action: 'COMPARE',
          actionMessage: `${a[j]} ${isNewMin ? '<' : '>='} ${a[minIdx]}`,
        },
        callStack: [{ fn: 'selectionSort', args: `scanning j=${j}`, line: 5 }],
      });

      if (isNewMin) {
        minIdx = j;
      }
    }

    if (minIdx !== i) {
      const temp = a[i];
      a[i] = a[minIdx];
      a[minIdx] = temp;

      steps.push({
        stepNumber: stepCount++,
        description: `Swapping arr[${i}] (${temp}) with minimum element arr[${minIdx}] (${a[i]}).`,
        codeLine: 6,
        state: {
          array: a.map((val, idx) => ({
            value: val,
            index: idx,
            status: idx <= i ? 'sorted' : idx === minIdx ? 'swapping' : 'default',
          })),
          pointers: { i, minIdx },
          action: 'SWAP',
          actionMessage: `Swapped index ${i} and ${minIdx}.`,
        },
        callStack: [{ fn: 'selectionSort', args: `swapped ${i} with ${minIdx}`, line: 6 }],
      });
    } else {
      steps.push({
        stepNumber: stepCount++,
        description: `arr[${i}] (${a[i]}) is already the minimum for range [${i}..${n - 1}]. No swap needed.`,
        codeLine: 6,
        state: {
          array: a.map((val, idx) => ({
            value: val,
            index: idx,
            status: idx <= i ? 'sorted' : 'default',
          })),
          pointers: { i },
          action: 'NO_SWAP',
          actionMessage: `Element ${a[i]} already in correct sorted position.`,
        },
        callStack: [{ fn: 'selectionSort', args: `i=${i} already in place`, line: 6 }],
      });
    }
  }

  steps.push({
    stepNumber: stepCount++,
    description: 'Selection Sort completed. All elements sorted in-place.',
    codeLine: 6,
    state: {
      array: a.map((val, idx) => ({ value: val, index: idx, status: 'sorted' })),
      pointers: {},
      action: 'DONE',
      actionMessage: 'All elements sorted in-place.',
    },
    callStack: [],
  });

  return {
    algorithm: 'selectionsort',
    title: 'Selection Sort Algorithm Visualization',
    category: 'sorting',
    complexity: {
      timeBest: 'O(N²)',
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
 * Sorting Algorithms Registry for Dynamic Comparison and Lookup
 */
export const SORTING_REGISTRY = {
  quicksort: {
    id: 'quicksort',
    name: 'Quicksort',
    badge: 'In-Place Partitioning',
    timeAvg: 'O(N log N)',
    timeWorst: 'O(N²)',
    space: 'O(log N)',
    stable: false,
    paradigm: 'Divide & Conquer (Pivot Partition)',
    pros: 'Fastest in practice, cache-friendly, O(1) extra array memory',
    cons: 'Worst-case O(N²) on sorted arrays with naive pivot',
    generator: generateQuicksortTrace,
  },
  mergesort: {
    id: 'mergesort',
    name: 'Mergesort',
    badge: 'Guaranteed O(N log N)',
    timeAvg: 'O(N log N)',
    timeWorst: 'O(N log N)',
    space: 'O(N)',
    stable: true,
    paradigm: 'Divide & Conquer (Subarray Merging)',
    pros: 'Guaranteed O(N log N) runtime, stable sort (preserves equal item order)',
    cons: 'Requires O(N) additional auxiliary buffer memory',
    generator: generateMergeSortTrace,
  },
  insertionsort: {
    id: 'insertionsort',
    name: 'Insertion Sort',
    badge: 'Adaptive O(N) Best-Case',
    timeAvg: 'O(N²)',
    timeWorst: 'O(N²)',
    space: 'O(1)',
    stable: true,
    paradigm: 'Incremental Insertion',
    pros: 'O(N) on nearly-sorted data, minimal overhead for small arrays (N <= 16)',
    cons: 'O(N²) shifts on reversed or random arrays',
    generator: generateInsertionSortTrace,
  },
  selectionsort: {
    id: 'selectionsort',
    name: 'Selection Sort',
    badge: 'Min Swaps O(N)',
    timeAvg: 'O(N²)',
    timeWorst: 'O(N²)',
    space: 'O(1)',
    stable: false,
    paradigm: 'Min/Max Scanning',
    pros: 'Guaranteed at most O(N) memory writes/swaps',
    cons: 'Always O(N²) comparisons even on sorted arrays',
    generator: generateSelectionSortTrace,
  },
  bubblesort: {
    id: 'bubblesort',
    name: 'Bubble Sort',
    badge: 'Adjacent Swapping',
    timeAvg: 'O(N²)',
    timeWorst: 'O(N²)',
    space: 'O(1)',
    stable: true,
    paradigm: 'Adjacent Inversion Elimination',
    pros: 'Simple invariant, detects already-sorted data in O(N)',
    cons: 'High number of swaps and comparisons on average',
    generator: generateBubbleSortTrace,
  },
};

/**
 * Creates dynamic comparative sorting trace for any set of algorithms
 */
export const createSortingComparisonTrace = (algorithmIds = ['quicksort', 'mergesort'], customArray) => {
  const arr = getCleanArray(customArray);
  const validIds = algorithmIds.filter((id) => SORTING_REGISTRY[id]);
  const activeIds = validIds.length >= 2 ? validIds : ['quicksort', 'mergesort'];

  const algorithms = activeIds.map((id) => {
    const meta = SORTING_REGISTRY[id];
    return {
      id: meta.id,
      name: meta.name,
      badge: meta.badge,
      timeAvg: meta.timeAvg,
      timeWorst: meta.timeWorst,
      space: meta.space,
      stable: meta.stable,
      paradigm: meta.paradigm,
      pros: meta.pros,
      cons: meta.cons,
      trace: meta.generator(arr),
    };
  });

  const primary = algorithms[0].trace;
  const titleNames = algorithms.map((a) => a.name).join(' vs ');

  return {
    ...primary,
    title: `${titleNames} Execution & Complexity Comparison`,
    comparison: {
      isComparison: true,
      title: `${titleNames} Comparison`,
      activeAlgorithm: algorithms[0].id,
      algorithms,
    },
  };
};

/**
 * 6. Binary Search Trace Generator
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
export const detectAndGenerateVisualizationTrace = (text = '', customArray) => {
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

  // 1. Detect any mentioned sorting algorithms, ordered by position in prompt
  const sortPatterns = [
    { id: 'quicksort', regex: /(quicksort|quick\s*sort|qsort)/i },
    { id: 'mergesort', regex: /(mergesort|merge\s*sort|msort)/i },
    { id: 'insertionsort', regex: /(insertionsort|insertion\s*sort|isort)/i },
    { id: 'selectionsort', regex: /(selectionsort|selection\s*sort|ssort)/i },
    { id: 'bubblesort', regex: /(bubblesort|bubble\s*sort|bsort)/i },
  ];

  const matches = [];
  for (const p of sortPatterns) {
    const idx = t.search(p.regex);
    if (idx !== -1) {
      matches.push({ id: p.id, index: idx });
    }
  }

  matches.sort((a, b) => a.index - b.index);
  const detectedSorts = matches.map((m) => m.id);

  // If 2 or more sorting algorithms detected (e.g. "selection sort vs insertion sort", "quicksort vs mergesort"):
  if (detectedSorts.length >= 2) {
    return createSortingComparisonTrace(detectedSorts, customArray);
  }

  // If exactly 1 sorting algorithm detected:
  if (detectedSorts.length === 1) {
    return SORTING_REGISTRY[detectedSorts[0]].generator(customArray);
  }

  // General sorting comparison query (e.g. "compare sorting algorithms", "sorting algorithms comparison"):
  if (
    (t.includes('compare') || t.includes('vs') || t.includes('difference')) &&
    (t.includes('sort') || t.includes('sorting'))
  ) {
    return createSortingComparisonTrace(
      ['quicksort', 'mergesort', 'insertionsort', 'selectionsort', 'bubblesort'],
      customArray
    );
  }

  // 2. Binary Search
  if (t.includes('binary search') && !t.includes('tree')) {
    return generateBinarySearchTrace(customArray);
  }

  // 3. Recursion / Fibonacci / Call Stack
  if (t.includes('recur') || t.includes('call stack') || t.includes('fibonacci') || t.includes('factorial')) {
    return generateRecursionTrace(4);
  }

  // 4. Breadth-First Search (BFS)
  if (t.includes('bfs') || t.includes('breadth first') || t.includes('breadth-first')) {
    return generateBFSTrace();
  }

  // 5. Depth-First Search (DFS)
  if (t.includes('dfs') || t.includes('depth first') || t.includes('depth-first')) {
    return generateDFSTrace();
  }

  // 6. General Sorting query fallback
  if (t.includes('sort') || t.includes('array')) {
    return generateQuicksortTrace(customArray);
  }

  // 7. General Graph query
  if (t.includes('graph') || t.includes('traversal')) {
    return generateBFSTrace();
  }

  // 8. General Tree query
  if (t.includes('tree') || t.includes('bst')) {
    return generateBinarySearchTrace(customArray);
  }

  return null;
};
