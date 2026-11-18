import type { ProjectTemplate } from '../../core/language/adapter';

export const overviewTour: ProjectTemplate = {
  id: '3d-tour',
  name: '3D Tour',
  description: 'Explore a runnable project as files, classes, functions, loops and connections.',
  entry: 'main.py',
  tree: {
    tour: { kind: 'folder' },
    'tour/__init__.py': { kind: 'file', content: '' },
    'main.py': {
      kind: 'file',
      content: `# Explore in Split or 3D; click a shape to open its source.
import math
from tour.models import Counter
from tour.analysis import summarize

values = [1, 2, 3, 4, 5, 6]
settings = {"threshold": 3, "enabled": True, "title": "3D Tour"}
counts, accepted = summarize(values, settings["threshold"])
counter = Counter()

for value in accepted:
    counter.add(value)

if settings["enabled"]:
    print(settings["title"])
    print(f"Accepted: {accepted}")
    print(f"Counts: {counts}")
    print(f"Total: {counter.value}")
    print(f"Integer root: {math.isqrt(counter.value)}")

assert counter.value == 18
`,
    },
    'tour/models.py': {
      kind: 'file',
      content: `class Named:
    category = "counter"

    def label(self):
        return self.category


class Counter(Named):
    def __init__(self, start: int = 0):
        self.value = start

    def add(self, amount: int = 1):
        self.value += amount
        return self.value
`,
    },
    'tour/analysis.py': {
      kind: 'file',
      content: `def summarize(values, limit: int = 3):
    counts = {"small": 0, "large": 0}
    accepted = []

    for value in values:
        if value >= limit:
            counts["large"] += 1
            accepted.append(value)
        else:
            counts["small"] += 1

    index = 0
    while index < len(accepted):
        index += 1

    return counts, accepted
`,
    },
  },
};
