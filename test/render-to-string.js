import test from 'ava';
import { renderToString } from '../src';

test('renderToString', t => {
  t.is(
    typeof renderToString,
    'function',
    'renderToString is a function'
  );
  t.pass('no tests yet');
});
