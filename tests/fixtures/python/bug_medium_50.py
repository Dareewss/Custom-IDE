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

def measure_0(items):
    result = [value * 2 for value in items if value > 0]
    return sum(result)
measured_0 = measure_0(values)

def measure_1(items):
    result = [value * 2 for value in items if value > 0]
    return sum(result)
measured_1 = measure_1(values)

def measure_2(items):
    result = [value * 2 for value in items if value > 0]
    return sum(result)
measured_2 = measure_2(values)

def measure_3(items):
    result = [value * 2 for value in items if value > 0]
    return sum(result)
measured_3 = measure_3(values)

def measure_4(items):
    result = [value * 2 for value in items if value > 0]
    return sum(result)
measured_4 = measure_4(values)
