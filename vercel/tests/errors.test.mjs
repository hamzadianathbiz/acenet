import test from 'node:test';
import assert from 'node:assert/strict';
import {publicError} from '../lib/errors.mjs';
test('storage outages report a retryable service failure without internal Blob details',()=>{
 for(const message of ['Vercel Blob: Failed to fetch blob: 403 Forbidden','Private storage is not connected.']){
  const result=publicError(new Error(message));assert.equal(result.status,503);assert.equal(result.retryAfter,900);assert.match(result.message,/app owner/);assert.doesNotMatch(result.message,/403|Blob/);
 }
 assert.equal(publicError(new Error('Choose a model.')).status,400);
});
