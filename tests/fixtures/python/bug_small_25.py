from math import sqrt

class Counter:
    def __init__(self):
        self.values = []

    def add(self, value):
        if value > 0:
            self.values.append(value)
        return len(self.values)

def summarize(values):
    total = 0
    for value in values:
        if value % 2:
            total += value
        else:
            total -= value
    return total

counter = Counter()
values = [1, 2, 3, 4]
for value in values:
    counter.add(value)
print(summarize(values), sqrt(16))
