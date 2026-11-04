from pkg.maths import add as plus
import pkg.maths as tools
import pkg.maths
from pkg import exposed
from pkg.base import Base
import math as std
from pkg.cycle_a import a

class Child(Base):
    def run(self, values):
        self.helper()
        self.inherited()
        plus(1, 2)
        tools.add(1, 2)
        pkg.maths.add(1, 2)
        exposed(1, 2)
        values()
        std.sqrt(4)
        unknown()
        factory().method()

    def helper(self):
        return plus(1, 2)

def factory():
    return Child()

def outer(callback):
    def local():
        return plus(1, 2)
    callback()
    local()
    global_fn()

def global_fn():
    return 1

plus(1, 2)
a()
