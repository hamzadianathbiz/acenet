import copy
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
import harness as h

PLAN = dict(goal='Deliver', constraints=[], assumptions=[],
            criteria=[dict(id='C1', requirement='Complete')],
            steps=[dict(id='S1', instructions='Produce it', depends_on=[], criteria_ids=['C1'])],
            assembly_instructions='Return the complete result')
RESULT = dict(answer='Complete answer', artifacts=[dict(path='result.txt', content='Done')], uncertainties=[])
PASS = dict(criteria=[dict(id='C1', passed=True, evidence='All present')], approved=True, feedback=[])
FAIL = dict(criteria=[dict(id='C1', passed=False, evidence='Missing content')], approved=False, feedback=['Fix it'])
CONFIG = dict(brain=dict(backend='codex', model='astra', rates=dict(input=10, cached_input=1, output=20)),
              body=dict(backend='codex', model='luna', rates=dict(input=1, cached_input=.1, output=2)),
              max_calls=12, max_repairs=1)


class Scripted:
    def __init__(self, responses):
        self.responses = iter(responses)
        self.prompts = []

    def __call__(self, config, prompt, schema, directory):
        self.prompts.append(prompt)
        value = next(self.responses)
        return json.dumps(value), dict(input_tokens=100, output_tokens=40, cached_input_tokens=20)


class Tests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name)

    def run_case(self, responses, config=None):
        provider = Scripted(responses)
        engine = h.Harness(config or CONFIG, self.root / 'run', provider)
        report = engine.run('EXACT ORIGINAL REQUIREMENT', [{'name': 'source', 'content': 'FACT'}])
        return engine, report, provider

    def test_success_preserves_source_and_exports(self):
        engine, r, p = self.run_case([PLAN, RESULT, PASS])
        self.assertEqual(r['status'], 'accepted_by_astra')
        self.assertTrue(all('EXACT ORIGINAL REQUIREMENT' in prompt and 'FACT' in prompt for prompt in p.prompts))
        self.assertEqual((engine.root / 'artifacts/result.txt').read_text(), 'Done')
        self.assertIsNotNone(r['total_cost_usd'])

    def test_repair_loop(self):
        _, r, p = self.run_case([PLAN, RESULT, FAIL, RESULT, PASS])
        self.assertEqual(r['status'], 'accepted_by_astra')
        self.assertEqual(r['calls'], 5)
        self.assertIn('Fix it', p.prompts[3])

    def test_rejected_has_no_final(self):
        engine, r, _ = self.run_case([PLAN, RESULT, FAIL, RESULT, FAIL])
        self.assertEqual(r['status'], 'needs_human_review')
        self.assertFalse((engine.root / 'final.json').exists())
        self.assertFalse((engine.root / 'artifacts').exists())

    def test_dependency_handoff_and_assembly(self):
        plan = copy.deepcopy(PLAN)
        plan['steps'].append(dict(id='S2', instructions='Extend', depends_on=['S1'], criteria_ids=['C1']))
        _, r, p = self.run_case([plan, RESULT, RESULT, RESULT, PASS])
        self.assertEqual(r['status'], 'accepted_by_astra')
        self.assertIn('Complete answer', p.prompts[2])

    def test_missing_review_criterion_fails_closed(self):
        review = dict(criteria=[dict(id='C2', passed=True, evidence='fake')], approved=True, feedback=[])
        engine, r, _ = self.run_case([PLAN, RESULT, review])
        self.assertEqual(r['status'], 'failed')
        self.assertFalse((engine.root / 'final.json').exists())

    def test_approval_cannot_override_failed_criterion(self):
        review = copy.deepcopy(FAIL)
        review['approved'] = True
        self.assertFalse(h.accepted(review, PLAN))

    def test_cycles_duplicate_ids_and_uncovered_criteria(self):
        for mode in ('cycle', 'duplicate', 'uncovered'):
            plan = copy.deepcopy(PLAN)
            if mode == 'cycle': plan['steps'][0]['depends_on'] = ['S1']
            if mode == 'duplicate': plan['criteria'].append(plan['criteria'][0])
            if mode == 'uncovered': plan['criteria'].append(dict(id='C2', requirement='Other'))
            with self.assertRaises(ValueError): h.check_plan(plan)

    def test_unsafe_and_colliding_paths(self):
        for path in ('../escape', '/tmp/escape', '.env', 'a/../../escape', 'a\\b'):
            result = copy.deepcopy(RESULT)
            result['artifacts'][0]['path'] = path
            with self.assertRaises(ValueError): h.safe_artifacts(result)

        for path in ('result.txt', 'RESULT.TXT', 'result.txt/child'):
            result = copy.deepcopy(RESULT)
            result['artifacts'].append(dict(path=path, content='Other'))
            with self.assertRaises(ValueError): h.safe_artifacts(result)

    def test_empty_file_is_valid(self):
        result = copy.deepcopy(RESULT)
        result['artifacts'] = [dict(path='package/__init__.py', content='')]
        h.safe_artifacts(result)

    def test_call_limit(self):
        config = dict(CONFIG, max_calls=2)
        engine, r, _ = self.run_case([PLAN, RESULT], config)
        self.assertEqual(r['status'], 'failed')
        self.assertEqual(r['calls'], 2)
        self.assertFalse((engine.root / 'final.json').exists())

    def test_no_context_truncation(self):
        _, r, _ = self.run_case([], dict(CONFIG, max_prompt_bytes=3))
        self.assertEqual(r['status'], 'failed')
        self.assertEqual(r['calls'], 0)

    def test_unknown_prices_not_zero(self):
        config = copy.deepcopy(CONFIG)
        config['brain']['rates'] = None
        _, r, _ = self.run_case([PLAN, RESULT, PASS], config)
        self.assertIsNone(r['total_cost_usd'])

    def test_cached_usage(self):
        self.assertAlmostEqual(h.usage_cost(dict(input_tokens=100, cached_input_tokens=50, output_tokens=20),
                                           dict(input=10, cached_input=1, output=20)), .00095)
        self.assertIsNone(h.usage_cost({}, CONFIG['brain']['rates']))

    def test_bad_config_rejected_before_run(self):
        for changes in ({'max_repairs': -1}, {'max_calls': True}, {'stop_after_usd': float('nan')}):
            with self.assertRaises(ValueError):
                h.Harness(dict(CONFIG, **changes), self.root / 'bad')

    def test_planner_knows_deliverable_schema(self):
        _, _, provider = self.run_case([PLAN, RESULT, PASS])
        self.assertIn('deliverable_schema', provider.prompts[0])
        self.assertIn('never require additional top-level fields', provider.prompts[0])

    def test_spend_threshold_stops_next_call(self):
        _, r, _ = self.run_case([PLAN], dict(CONFIG, stop_after_usd=.00001))
        self.assertEqual(r['calls'], 1)
        self.assertEqual(r['status'], 'failed')

    def test_baseline_and_comparison(self):
        engine, r, _ = self.run_case([PLAN, RESULT, PASS])
        base = h.Harness(CONFIG, self.root / 'base', Scripted([RESULT]))
        base.run('EXACT ORIGINAL REQUIREMENT', [{'name': 'source', 'content': 'FACT'}], baseline=True)
        result = h.compare(engine.root, base.root)
        self.assertGreater(result['cost_ratio'], 1)
        self.assertFalse(result['tenfold_cost_target_met'])
        self.assertIn('unmeasured', result['quality_parity'])

    def test_codex_event_parsing(self):
        directory = self.root / 'call'
        directory.mkdir()
        events = [dict(type='item.completed', item=dict(type='agent_message', text=json.dumps(RESULT))),
                  dict(type='turn.completed', usage=dict(input_tokens=123, output_tokens=10, cached_input_tokens=23))]
        from types import SimpleNamespace
        proc = SimpleNamespace(returncode=0, stdout='\n'.join(json.dumps(e) for e in events), stderr='')
        with patch('harness.subprocess.run', return_value=proc) as mock:
            text, usage = h.Provider()(CONFIG['brain'], 'prompt', h.RESULT, directory)
        self.assertEqual(json.loads(text), RESULT)
        self.assertEqual(usage['input_tokens'], 123)
        self.assertIn('--ignore-user-config', mock.call_args.args[0])

    def test_responses_adapter(self):
        directory = self.root / 'call'
        directory.mkdir()
        raw = dict(status='completed', output=[dict(type='message', content=[dict(type='output_text', text=json.dumps(RESULT))])],
                   usage=dict(input_tokens=100, output_tokens=30, input_tokens_details=dict(cached_tokens=10)))
        import io
        with patch('harness.urllib.request.urlopen', return_value=io.StringIO(json.dumps(raw))) as mock:
            text, usage = h.Provider()(dict(backend='responses', model='astra'), 'prompt', h.RESULT, directory)
        self.assertEqual(json.loads(text), RESULT)
        self.assertEqual(usage['cached_input_tokens'], 10)
        self.assertFalse(json.loads(mock.call_args.args[0].data)['store'])

    def test_truncated_chat_rejected(self):
        directory = self.root / 'call'
        directory.mkdir()
        import io
        raw = {'choices': [{'finish_reason': 'length', 'message': {'content': '{}'}}]}
        with patch('harness.urllib.request.urlopen', return_value=io.StringIO(json.dumps(raw))):
            with self.assertRaises(RuntimeError):
                h.Provider()(dict(backend='chat', model='local', base_url='http://localhost:11434/v1'), 'p', h.RESULT, directory)


if __name__ == '__main__':
    unittest.main()

class NativeAdapterValidationTests(unittest.TestCase):
    def test_native_backends_require_an_explicit_provider_adapter(self):
        for backend in ('claude', 'openrouter'):
            config = copy.deepcopy(CONFIG)
            config['body']['backend'] = backend
            with tempfile.TemporaryDirectory() as d:
                with self.assertRaises(ValueError):
                    h.Harness(config, Path(d) / 'default')
                h.Harness(config, Path(d) / 'adapted', provider=lambda *args: None)
