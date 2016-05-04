import { Observable, Subject } from 'rx';
import test from 'tape';
import { spy } from 'sinon';
import { applyMiddleware, createStore } from 'redux';
import { createEpic } from '../src';

const setup = (saga, spy) => {
  const reducer = (state = 0) => state;
  const epicMiddleware = createEpic(
    action$ => action$
      .filter(({ type }) => type === 'foo')
      .map(() => ({ type: 'bar' })),
    action$ => action$
      .filter(({ type }) => type === 'bar')
      .map(({ type: 'baz' })),
    saga ? saga : () => Observable.empty()
  );
  const store = applyMiddleware(epicMiddleware)(createStore)(spy || reducer);
  return {
    reducer,
    epicMiddleware,
    store
  };
};

test('createEpic', t => {
  const epicMiddleware = createEpic(
    action$ => action$.map({ type: 'foo' })
  );
  t.equal(
    typeof epicMiddleware,
    'function',
    'epicMiddleware is a function'
  );
  t.equal(
    typeof epicMiddleware.subscribe,
    'function',
    'epicMiddleware has a subscription method'
  );
  t.equal(
    typeof epicMiddleware.subscribeOnCompleted,
    'function',
    'epicMiddleware has a subscribeOnCompleted method'
  );
  t.equal(
    typeof epicMiddleware.end,
    'function',
    'epicMiddleware does have an end method'
  );
  t.equal(
    typeof epicMiddleware.restart,
    'function',
    'epicMiddleware does have a restart method'
  );
  t.equal(
    typeof epicMiddleware.dispose,
    'function',
    'epicMiddleware does have a dispose method'
  );
  t.end();
});

test('dispatching actions', t => {
  const reducer = spy((state = 0) => state);
  const { store } = setup(null, reducer);
  store.dispatch({ type: 'foo' });
  t.equal(reducer.callCount, 4, 'reducer is called four times');
  t.assert(
    reducer.getCall(1).calledWith(0, { type: 'foo' }),
    'reducer called with initial action'
  );
  t.assert(
    reducer.getCall(2).calledWith(0, { type: 'bar' }),
    'reducer was called with saga action'
  );
  t.assert(
    reducer.getCall(3).calledWith(0, { type: 'baz' }),
    'second saga responded to action from first saga'
  );
  t.end();
});

test('lifecycle', t => {
  t.test('subscribe', t => {
    const { epicMiddleware } = setup();
    const subscription = epicMiddleware.subscribeOnCompleted(() => {});
    t.assert(
      subscription,
      'subscribe did return a disposable'
    );
    t.isEqual(
      typeof subscription.dispose,
      'function',
      'disposable does have a dispose method'
    );
    t.doesNotThrow(
      () => subscription.dispose(),
      'disposable is disposable'
    );
    t.end();
  });

  t.test('end', t => {
    const result$ = new Subject();
    const { epicMiddleware } = setup(() => result$);
    epicMiddleware.subscribeOnCompleted(() => {
      t.pass('all sagas completed');
      t.end();
    });
    epicMiddleware.end();
    t.pass('saga still active');
    result$.onCompleted();
  });

  t.test('disposable', t => {
    const result$ = new Subject();
    const { epicMiddleware } = setup(() => result$);
    t.plan(2);
    epicMiddleware.subscribeOnCompleted(() => {
      t.fail('all sagas completed');
    });
    t.assert(
      result$.hasObservers(),
      'saga is observed by epicMiddleware'
    );
    epicMiddleware.dispose();
    t.false(
      result$.hasObservers(),
      'watcher has no observers after epicMiddleware is disposed'
    );
  });
});

test('restart', t => {
  const reducer = spy((state = 0) => state);
  const { epicMiddleware, store } = setup(null, reducer);
  store.dispatch({ type: 'foo' });
  t.assert(
    reducer.getCall(1).calledWith(0, { type: 'foo' }),
    'reducer called with initial dispatch'
  );
  t.assert(
    reducer.getCall(2).calledWith(0, { type: 'bar' }),
    'reducer called with saga action'
  );
  t.assert(
    reducer.getCall(3).calledWith(0, { type: 'baz' }),
    'second saga responded to action from first saga'
  );
  epicMiddleware.end();
  t.equal(reducer.callCount, 4, 'saga produced correct amount of actions');
  epicMiddleware.restart();
  store.dispatch({ type: 'foo' });
  t.equal(
    reducer.callCount,
    7,
    'saga restart and produced correct amount of actions'
  );
  t.assert(
    reducer.getCall(4).calledWith(0, { type: 'foo' }),
    'reducer called with second dispatch'
  );
  t.assert(
    reducer.getCall(5).calledWith(0, { type: 'bar' }),
    'reducer called with saga reaction'
  );
  t.assert(
    reducer.getCall(6).calledWith(0, { type: 'baz' }),
    'second saga responded to action from first saga'
  );
  t.end();
});

test('long lived saga', t => {
  let count = 0;
  const tickSaga = action$ => action$
    .filter(({ type }) => type === 'start-tick')
    .flatMap(() => Observable.interval(500))
    // make sure long lived saga's do not persist after
    // action$ has completed
    .takeUntil(action$.last())
    .map(({ type: 'tick' }));

  const reducerSpy = spy((state = 0) => state);
  const { store, epicMiddleware } = setup(tickSaga, reducerSpy);
  const unlisten = store.subscribe(() => {
    count += 1;
    if (count >= 5) {
      epicMiddleware.end();
    }
  });
  epicMiddleware.subscribeOnCompleted(() => {
    t.equal(
      count,
      5,
      'saga dispatched correct amount of ticks'
    );
    unlisten();
    t.pass('long lived saga completed');
    t.end();
  });
  store.dispatch({ type: 'start-tick' });
});

test('throws', t => {
  const tr8tr = () => 'traitor!';
  const identity = action$ => action$;
  t.plan(2);
  t.throws(
    () => setup(tr8tr),
    'epicMiddleware should throw sagas that do not return observables'
  );
  t.throws(
    () => setup(identity),
    'epicMiddleware should throw sagas return the original action observable'
  );
});
