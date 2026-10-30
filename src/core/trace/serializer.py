import types as _atlas_types
import itertools as _atlas_itertools

def _atlas_type_name(value):
    return type.__getattribute__(type(value), '__name__')[:80]

def _atlas_safe_value(value, depth=0, seen=None, budget=None):
    seen = set() if seen is None else seen
    budget = [200] if budget is None else budget
    kind = _atlas_type_name(value)
    result = dict(type=kind, value='<' + kind + '>')
    if budget[0] <= 0:
        result['truncated'] = True
        return result
    budget[0] -= 1
    exact = type(value)
    if exact in (type(None), bool, float, complex):
        result['value'] = repr(value)
        return result
    if exact is int:
        try: result['value'] = repr(value)[:200]
        except ValueError: result['value'] = f'integer ({value.bit_length()} bits)'
        return result
    if exact in (str, bytes):
        result['value'] = repr(value[:200])
        if len(value) > 200: result.update(value=result['value'] + '…', truncated=True)
        return result
    if id(value) in seen:
        result.update(value='↻ circular reference', truncated=True)
        return result
    if exact in (list, tuple, set, frozenset, dict):
        result['value'] = f'{kind} ({len(value)} items)'
        items = value.items() if exact is dict else enumerate(value)
        length = len(value)
    else:
        attributes = None
        for cls in type.__getattribute__(exact, '__mro__'):
            descriptor = type.__getattribute__(cls, '__dict__').get('__dict__')
            if descriptor is not None:
                if type(descriptor) is _atlas_types.GetSetDescriptorType:
                    try: attributes = descriptor.__get__(value, exact)
                    except (TypeError, AttributeError): pass
                break
        if type(attributes) is not dict:
            return result
        items = attributes.items()
        length = len(attributes)
    if depth >= 3:
        result['truncated'] = True
        return result
    seen.add(id(value))
    children = []
    for key, child in _atlas_itertools.islice(items, 20):
        if budget[0] <= 0: break
        if type(key) is str: name = key[:100]
        elif type(key) in (int, bool, float, type(None)):
            try: name = repr(key)[:100]
            except ValueError: name = '<int>'
        else: name = '<' + _atlas_type_name(key) + '>'
        children.append(dict(name=name, value=_atlas_safe_value(child, depth + 1, seen, budget)))
    seen.remove(id(value))
    result['children'] = children
    if len(children) < length: result['truncated'] = True
    return result

def _atlas_scope(mapping):
    result = {}
    budget = [300]
    for name, value in mapping.items():
        if type(name) is not str or name.startswith('__'): continue
        if len(result) >= 60 or budget[0] <= 0: break
        result[name[:100]] = _atlas_safe_value(value, budget=budget)
    return result

def _atlas_stack(frame):
    stack = []
    while frame and len(stack) < 40:
        if frame.f_code.co_filename.startswith('/project/'):
            stack.append(dict(name=frame.f_code.co_name, location=dict(path=frame.f_code.co_filename[9:], line=frame.f_lineno, column=1)))
        frame = frame.f_back
    return stack
