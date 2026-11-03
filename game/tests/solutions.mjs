// Independent acceptance fixtures transcribed from the approved puzzle cards.
export const SOLUTIONS = {
  'P00-1': ['C', 'T', 'S'], 'P00-2': 'H',
  'R1-1': ['D', 'A', 'B', 'C'], 'R1-2': 1, 'R1-3': ['C', 'B', 'A', 'D'],
  'R2-1': [2, 3, 5], 'R2-2': ['E', 'W', 'E', 'W'], 'R2-3': 5,
  'R3-1': [3, 4], 'R3-2': ['\\', '\\', '/'], 'R3-3': [4, 3],
  'R4-1': ['W', 'B', 'F', 'D'], 'R4-2': { camera: 2, middle: 4, back: 6 }, 'R4-3': [1, 1, 1, 0],
  'R5-1': ['W', 'S', 'E', 'N'], 'R5-2': ['R41', 'A41', 'S42', 'A42'], 'R5-3': ['S', 'A', 'C', 'T'],
  'R6-1': { direction: 'CCW', turns: 1, swap: false }, 'R6-2': 29, 'R6-3': [0, 1, 1, 0, 0, 1],
  'F-1': ['L', 'R', 'L', 'M'], 'F-2': { mirrors: ['/', '/', '\\'], camera: 3, middle: 6, back: 9 },
  'F-3': { order: ['S', 'R', 'D', 'K'], drop: 'D', undo: ['K', 'R', 'S'] },
  'O-1': 'C', 'O-2': 'A', 'O-3': 'C', 'O-4': ['L', 'S', 'S'], 'O-5': [2, 1, 1], 'O-6': ['L', 'L', 'L', 'R'],
};

export function* permutations(a) {
  if (!a.length) { yield []; return; }
  for (let i = 0; i < a.length; i++) for (const rest of permutations([...a.slice(0, i), ...a.slice(i + 1)])) yield [a[i], ...rest];
}
export function* product(...domains) {
  if (!domains.length) { yield []; return; }
  for (const v of domains[0]) for (const tail of product(...domains.slice(1))) yield [v, ...tail];
}
const range = (lo, hi) => Array.from({ length: hi - lo + 1 }, (_, i) => i + lo);
export const DOMAINS = {
  'P00-1': () => permutations(['C', 'T', 'S']), 'P00-2': () => ['H', 'G', 'L'],
  'R1-1': () => permutations([...'DABC']), 'R1-2': () => range(0, 3), 'R1-3': () => permutations([...'DABC']),
  'R2-1': () => product(...Array(3).fill(range(1, 6))), 'R2-2': () => product(...Array(4).fill(['E', 'W'])), 'R2-3': () => range(0, 5),
  'R3-1': () => product(range(1, 6), range(1, 6)), 'R3-2': () => product(...Array(3).fill(['/', '\\'])), 'R3-3': () => product(range(1, 5), range(1, 5)),
  'R4-1': () => permutations([...'WBFD']),
  'R4-2': () => [...product(range(0, 3), range(2, 5), range(4, 7))].map(([camera, middle, back]) => ({ camera, middle, back })),
  'R4-3': () => product(...Array(4).fill([0, 1])),
  'R5-1': () => permutations([...'NESW']), 'R5-2': () => permutations(['R41', 'A41', 'S42', 'A42']),
  'R5-3': () => [['S', 'A', 'C', 'T'], ['S', 'A', 'T'], ['S', 'B', 'C', 'T'], ['S', 'B', 'T']],
  'R6-1': () => [...product(['CW', 'CCW'], [0.5, 1, 1.5, 2, 3])].map(([direction, turns]) => ({ direction, turns, swap: false })),
  'R6-2': () => range(0, 59), 'R6-3': () => product(...Array(6).fill([0, 1])),
  'F-1': () => product(...Array(4).fill(['L', 'R', 'M'])),
  'F-2': () => [...product([...product(...Array(3).fill(['/', '\\']))], range(0, 3), range(4, 7), range(7, 10))].map(([mirrors, camera, middle, back]) => ({ mirrors, camera, middle, back })),
  'F-3': () => [...product([...permutations([...'SRDK'])], [...'SRDK'])].flatMap(([order, drop]) => [...permutations([...'SRDK'].filter(v => v !== drop))].map(undo => ({ order, drop, undo }))),
  'O-1': () => ['A', 'B', 'C'], 'O-2': () => ['A', 'B', 'C'], 'O-3': () => ['A', 'B', 'C', 'D'],
  'O-4': () => product(...Array(3).fill(['L', 'S'])), 'O-5': () => product(range(0, 2), range(0, 2), range(0, 1)), 'O-6': () => product(...Array(4).fill(['L', 'R'])),
};
