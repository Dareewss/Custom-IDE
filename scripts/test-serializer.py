import json
import runpy
import unittest

serializer = runpy.run_path('src/core/trace/serializer.py')
safe = serializer['_atlas_safe_value']

class SerializerTests(unittest.TestCase):
    def test_cycles(self):
        value = []
        value.append(value)
        result = safe(value)
        self.assertIn('circular', result['children'][0]['value']['value'])

    def test_bounds(self):
        self.assertLess(len(json.dumps(safe([list(range(1000))] * 1000))), 20000)
        self.assertTrue(safe('x' * 10000)['truncated'])
        self.assertEqual(len(safe(list(range(1000)))['children']), 20)

    def test_does_not_execute_user_hooks(self):
        class Trap:
            def __repr__(self): raise AssertionError('repr called')
            def __getattribute__(self, key): raise AssertionError('attribute hook called')
        obj = Trap()
        object.__setattr__(obj, 'answer', 42)
        self.assertEqual(safe(obj)['children'][0]['value']['value'], '42')

        class PropertyTrap:
            @property
            def __dict__(self): raise AssertionError('descriptor called')
        self.assertEqual(safe(PropertyTrap())['type'], 'PropertyTrap')

    def test_module_scope_filters_internal_names(self):
        result = serializer['_atlas_scope']({'__builtins__': {}, 'count': 3})
        self.assertEqual(list(result), ['count'])
        self.assertEqual(result['count']['value'], '3')

if __name__ == '__main__': unittest.main()
