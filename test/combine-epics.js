import test from 'ava';
import sinon from 'sinon';
import { Observable, Subject } from 'rx';

import { combineEpics, ofType } from '../src';

test('should combine epics', t => {
  const epic1 = (actions, store) => actions::ofType('ACTION1')
    .map(action => ({ type: 'DELEGATED1', action, store }));
  const epic2 = (actions, store) => actions::ofType('ACTION2')
    .map(action => ({ type: 'DELEGATED2', action, store }));

  const epic = combineEpics(epic1, epic2);
  const store = { I: 'am', a: 'store' };
  const actions = new Subject();
  const result = epic(actions, store);
  const emittedActions = [];

  result.subscribe(emittedAction => emittedActions.push(emittedAction));

  actions.onNext({ type: 'ACTION1' });
  actions.onNext({ type: 'ACTION2' });

  t.deepEqual(
    emittedActions,
    [
      { type: 'DELEGATED1', action: { type: 'ACTION1' }, store },
      { type: 'DELEGATED2', action: { type: 'ACTION2' }, store }
    ]
  );
});

test('should pass along every argument arbitrarily', t => {
  const epic1 = sinon.stub().returns(Observable.of('first'));
  const epic2 = sinon.stub().returns(Observable.of('second'));

  const rootEpic = combineEpics(epic1, epic2);
  // ava does not support rxjsv4
  return rootEpic(1, 2, 3, 4)
    .toArray()
    .subscribe(values => {
      console.log('foo: ', values);
      t.deepEqual(values, ['first', 'second']);
      t.is(epic1.callCount, 1);
      t.is(epic2.callCount, 1);

      t.deepEqual(epic1.firstCall.args, [1, 2, 3, 4]);
      t.deepEqual(epic2.firstCall.args, [1, 2, 3, 4]);
    });
});

test(
  'should errors if epic doesn\'t return anything', t => {
  const epic1 = () => [];
  const epic2 = () => {};
  const rootEpic = combineEpics(epic1, epic2);

  t.throws(
    () => rootEpic(),
    /does not return a stream/i
  );
});
