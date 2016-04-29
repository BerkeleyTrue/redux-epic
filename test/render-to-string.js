import test from 'tape';
import renderToString from '../src/render-to-string';

test('renderToString', t => {
  t.isEqual(
    typeof renderToString,
    'function',
    'renderToString is a function'
  );
  t.pass('no tests yet');
  t.end();
});
