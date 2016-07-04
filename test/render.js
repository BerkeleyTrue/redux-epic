import test from 'ava';
import { render } from '../src';

test('render', t => {
  t.is(
    typeof render,
    'function',
    'render is a function'
  );
  t.pass('no tests yet');
});
