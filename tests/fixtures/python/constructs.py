class Counter:
    initial: int = 0

    def __init__(self, label: str = "items", *args, **kwargs):
        self.label = label
        self.values = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]

    def total(self, limit: int = 5) -> int:
        count = 0
        for value in self.values:
            if value > limit:
                count += value
            elif value == 0:
                count = 1
            else:
                count = 2
        while count < limit:
            count += 1
        return count

def outer(x: int):
    def inner(y):
        return x + y
    return inner(x)

enabled = True
settings = {"size": 3, "name": "Atlas"}
empty = []
pair = (1, "two")
unique = {1, 2}
computed = [n * 2 for n in range(10) if n > 2]
left, right = [1, 2]
greeting = "😀"; after = 3
