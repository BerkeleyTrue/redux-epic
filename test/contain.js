import test from 'tape';
import { contain } from '../src';

test('contain', t => {
  t.isEqual(
    typeof contain,
    'function',
    'contain is a function'
  );
  t.pass('no tests yet');
  t.end();
});
