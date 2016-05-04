import test from 'tape';
import { render } from '../src';

test('render', t => {
  t.isEqual(
    typeof render,
    'function',
    'render is a function'
  );
  t.pass('no tests yet');
  t.end();
});
