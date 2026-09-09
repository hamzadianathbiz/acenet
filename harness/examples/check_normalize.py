"""Independent acceptance checks for examples/brief.md; run only on inspected code."""
import copy
from decimal import Decimal
import importlib.util
from pathlib import Path
import sys
import unittest

spec = importlib.util.spec_from_file_location('candidate', Path(sys.argv.pop(1)) / 'normalize_deals.py')
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
normalize = module.normalize_deals


class Acceptance(unittest.TestCase):
    def test_empty(self):
        rows = []
        result = normalize(rows)
        self.assertEqual(result, [])
        self.assertIsNot(result, rows)

    def test_rounding(self):
        for value, expected in [('1.005', 101), (2.675, 268), ('0.0049', 0), ('0.005', 1), (Decimal('10.999'), 1100)]:
            with self.subTest(value=value):
                result = normalize([{'name': ' A ', 'amount_usd': value}])
                self.assertEqual(result, [{'name': 'A', 'amount_cents': expected}])
                self.assertIs(type(result[0]['amount_cents']), int)

    def test_sorting_and_nonmutation(self):
        rows = [{'name': ' Z ', 'amount_usd': 2}, {'name': ' A ', 'amount_usd': 1}]
        before = copy.deepcopy(rows)
        result = normalize(rows)
        self.assertEqual([r['name'] for r in result], ['A', 'Z'])
        self.assertEqual(rows, before)
        result[0]['name'] = 'changed'
        self.assertEqual(rows, before)

    def test_rejected_amounts(self):
        for value in [True, False, -1, '-0.001', 'NaN', Decimal('sNaN'), float('inf'), '-Infinity', 'bad', None]:
            with self.subTest(value=repr(value)), self.assertRaises(ValueError):
                normalize([{'name': 'A', 'amount_usd': value}])

    def test_rejected_names(self):
        for name in ['', '   ', None, 1, True]:
            with self.subTest(name=name), self.assertRaises(ValueError):
                normalize([{'name': name, 'amount_usd': 1}])
        with self.assertRaises(ValueError):
            normalize([{'amount_usd': 1}])


if __name__ == '__main__':
    unittest.main()
