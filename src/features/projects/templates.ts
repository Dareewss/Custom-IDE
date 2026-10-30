import { python, type ProjectTemplate } from '../../core/language/adapter';

export const templates: ProjectTemplate[] = [
  {
    id: 'hello',
    name: 'Hello World',
    description: 'A clean slate and your first line of Python.',
    entry: 'main.py',
    tree: {
      'main.py': {
        kind: 'file',
        content: '# Every idea starts somewhere.\n\nmessage = "Hello, world!"\nprint(message)\n',
      },
    },
  },
  {
    id: 'input',
    name: 'Input / Output',
    description: 'Make a little conversation with your program.',
    entry: 'main.py',
    tree: {
      'main.py': {
        kind: 'file',
        content:
          'name = input("What is your name? ")\nage = int(input("How old are you? "))\n\nprint(f"Hello, {name}!")\nprint(f"Next year you will be {age + 1}.")\n',
      },
    },
  },
  {
    id: 'functions',
    name: 'Functions & Classes',
    description: 'Build reusable pieces with functions and a small class.',
    entry: 'main.py',
    tree: {
      'main.py': {
        kind: 'file',
        content:
          'def square(number):\n    return number * number\n\n\nclass Counter:\n    def __init__(self, start=0):\n        self.value = start\n\n    def increment(self):\n        self.value += 1\n        return self.value\n\n\ncounter = Counter()\nfor number in range(1, 5):\n    print(f"Step {counter.increment()}: {number} squared is {square(number)}")\n',
      },
    },
  },
  {
    id: 'algorithms',
    name: 'Algorithms',
    description: 'Explore binary search, one decision at a time.',
    entry: 'main.py',
    tree: {
      'main.py': {
        kind: 'file',
        content:
          'def binary_search(numbers, target):\n    low, high = 0, len(numbers) - 1\n    while low <= high:\n        middle = (low + high) // 2\n        print(f"Searching indices {low}..{high}, checking {middle}")\n        if numbers[middle] == target:\n            return middle\n        if numbers[middle] < target:\n            low = middle + 1\n        else:\n            high = middle - 1\n    return -1\n\n\nvalues = [2, 5, 8, 12, 16, 23, 38, 56]\nindex = binary_search(values, 23)\nprint(f"Found 23 at index {index}")\nassert index == 5\nassert binary_search(values, 99) == -1\n',
      },
    },
  },
  {
    id: 'multi',
    name: 'Multi-file project',
    description: 'Give your ideas room to grow across Python modules.',
    entry: 'main.py',
    tree: {
      lib: { kind: 'folder' },
      'lib/__init__.py': { kind: 'file', content: '' },
      'lib/greeter.py': {
        kind: 'file',
        content: 'def greet(name):\n    return f"Hello, {name}! Your modules work together."\n',
      },
      'main.py': {
        kind: 'file',
        content:
          'from lib.greeter import greet\n\n\nfor name in ["Ada", "Grace", "Guido"]:\n    print(greet(name))\n',
      },
      'README.md': {
        kind: 'file',
        content:
          '# Multi-file project\n\nRun main.py. It imports greet from lib/greeter.py.\nThe working directory is the project root.\n',
      },
    },
  },
];
python.templates = templates;
