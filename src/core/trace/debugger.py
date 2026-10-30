import sys as _atlas_sys
import json as _atlas_json
import time as _atlas_time
from _atlas_debug import emit as _atlas_emit, pause as _atlas_pause

_atlas_bp = _atlas_json.loads(_atlas_breakpoints)
_atlas_debug_enabled = any(_atlas_bp.values())
_atlas_step_depth = None
_atlas_event_count = 0

def _atlas_simple_value(value):
    kind = type(value).__name__
    if type(value) in (type(None), bool, int, float, str):
        return dict(type=kind, value=repr(value)[:160])
    return dict(type=kind, value='<' + kind + '>')

def _atlas_trace(frame, event, arg):
    global _atlas_step_depth, _atlas_event_count
    filename = frame.f_code.co_filename
    if not filename.startswith('/project/'):
        return None
    location = dict(path=filename[9:], line=frame.f_lineno, column=1)
    trace = dict(timestamp=_atlas_time.perf_counter() * 1000, location=location, frameId=id(frame))
    if event == 'call':
        trace.update(type='call', functionName=frame.f_code.co_name, parentFrameId=id(frame.f_back) if frame.f_back and frame.f_back.f_code.co_filename.startswith('/project/') else None)
    elif event == 'return':
        trace.update(type='return', value=_atlas_simple_value(arg))
    elif event == 'exception':
        trace.update(type='exception', name=arg[0].__name__, message=str(arg[1])[:300])
    else:
        trace.update(type='line')
    if _atlas_event_count < 5000:
        _atlas_emit(_atlas_json.dumps(trace))
        _atlas_event_count += 1
    if event == 'line':
        depth = 0
        parent = frame
        while parent:
            depth += 1
            parent = parent.f_back
        should_step = _atlas_step_depth is not None and depth <= _atlas_step_depth
        if frame.f_lineno in _atlas_bp.get(location['path'], []) or should_step:
            command = _atlas_pause(_atlas_json.dumps(location))
            _atlas_step_depth = depth if command == 2 else None
    return _atlas_trace
