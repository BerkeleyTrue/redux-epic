import test from 'ava';
import { contain } from '../src';

test('contain', t => {
  t.is(
    typeof contain,
    'function',
    'contain is a function'
  );
  t.pass('no tests yet');
});
