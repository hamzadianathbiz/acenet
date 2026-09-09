"""One isolated harness job. Secrets arrive on stdin and stay in this process."""
import json
import os
from pathlib import Path
import sys
sys.path.insert(0, str(Path(__file__).resolve().parent.parent / 'harness'))
from harness import Harness

job = json.load(sys.stdin)
for role, key in job.pop('credentials', {}).items():
    if key:
        os.environ['ACENET_' + role.upper() + '_KEY'] = key
engine = Harness(job['config'], job['directory'])
result = engine.run(job['brief'], job['context'], baseline=job['baseline'])
sys.exit(0 if result['status'] in ('accepted_by_astra', 'baseline_complete') else 1)
