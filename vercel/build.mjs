import {readFile} from 'node:fs/promises';
await readFile('lib/worker.generated.mjs');console.log('Standalone ACENET assets ready.');
