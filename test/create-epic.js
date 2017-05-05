import { Observable, Subject } from 'rx';
import test from 'ava';
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
  t.is(
    typeof epicMiddleware,
    'function',
    'epicMiddleware is a function'
  );
  t.is(
    typeof epicMiddleware.subscribe,
    'function',
    'epicMiddleware has a subscription method'
  );
  t.is(
    typeof epicMiddleware.subscribeOnCompleted,
    'function',
    'epicMiddleware has a subscribeOnCompleted method'
  );
  t.is(
    typeof epicMiddleware.end,
    'function',
    'epicMiddleware does have an end method'
  );
  t.is(
    typeof epicMiddleware.restart,
    'function',
    'epicMiddleware does have a restart method'
  );
  t.is(
    typeof epicMiddleware.dispose,
    'function',
    'epicMiddleware does have a dispose method'
  );
});

test('dispatching actions', t => {
  const reducer = spy((state = 0) => state);
  const { store } = setup(null, reducer);
  store.dispatch({ type: 'foo' });
  t.is(reducer.callCount, 4, 'reducer is called four times');
  t.true(
    reducer.getCall(1).calledWith(0, { type: 'foo' }),
    'reducer called with initial action'
  );
  t.true(
    reducer.getCall(2).calledWith(0, { type: 'bar' }),
    'reducer was called with saga action'
  );
  t.true(
    reducer.getCall(3).calledWith(0, { type: 'baz' }),
    'second saga responded to action from first saga'
  );
});

test('lifecycle subscribe', t => {
  const { epicMiddleware } = setup();
  const subscription = epicMiddleware.subscribe(() => {});
  const subscription2 = epicMiddleware.subscribeOnCompleted(() => {});
  t.is(
    typeof subscription,
    'object',
    'subscribe did return a disposable'
  );
  t.is(
    typeof subscription.dispose,
    'function',
    'disposable does have a dispose method'
  );
  t.notThrows(
    () => subscription.dispose(),
    'disposable is disposable'
  );
  t.is(
    typeof subscription2,
    'object',
    'subscribe did return a disposable'
  );
  t.is(
    typeof subscription2.dispose,
    'function',
    'disposable does have a dispose method'
  );
  t.notThrows(
    () => subscription2.dispose(),
    'disposable is disposable'
  );
});

test.cb('lifecycle end', t => {
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

test('lifecycle disposable', t => {
  const result$ = new Subject();
  const { epicMiddleware } = setup(() => result$);
  t.plan(2);
  epicMiddleware.subscribeOnCompleted(() => {
    t.fail('all sagas completed');
  });
  t.true(
    result$.hasObservers(),
    'saga is observed by epicMiddleware'
  );
  epicMiddleware.dispose();
  t.false(
    result$.hasObservers(),
    'watcher has no observers after epicMiddleware is disposed'
  );
});

test('restart', t => {
  const reducer = spy((state = 0) => state);
  const { epicMiddleware, store } = setup(null, reducer);
  store.dispatch({ type: 'foo' });
  t.true(
    reducer.getCall(1).calledWith(0, { type: 'foo' }),
    'reducer called with initial dispatch'
  );
  t.true(
    reducer.getCall(2).calledWith(0, { type: 'bar' }),
    'reducer called with saga action'
  );
  t.true(
    reducer.getCall(3).calledWith(0, { type: 'baz' }),
    'second saga responded to action from first saga'
  );
  epicMiddleware.end();
  t.is(reducer.callCount, 4, 'saga produced correct amount of actions');
  epicMiddleware.restart();
  store.dispatch({ type: 'foo' });
  t.is(
    reducer.callCount,
    7,
    'saga restart and produced correct amount of actions'
  );
  t.true(
    reducer.getCall(4).calledWith(0, { type: 'foo' }),
    'reducer called with second dispatch'
  );
  t.true(
    reducer.getCall(5).calledWith(0, { type: 'bar' }),
    'reducer called with saga reaction'
  );
  t.true(
    reducer.getCall(6).calledWith(0, { type: 'baz' }),
    'second saga responded to action from first saga'
  );
});

test.cb('long lived saga', t => {
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
    t.is(
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
    null,
    'epicMiddleware should throw sagas that do not return observables'
  );
  t.throws(
    () => setup(identity),
    null,
    'epicMiddleware should throw sagas return the original action observable'
  );
});

test('dependencies', t => {
  t.plan(1);
  const myDep = {};
  const reducer = (state = 0) => state;
  const saga = (actions$, getState, deps) => {
    t.is(deps.myDep, myDep);
    return Observable.empty();
  };
  const epicMiddleware = createEpic({ myDep }, saga);
  createStore(reducer, 0, applyMiddleware(epicMiddleware));
});

test('warn about second argument of epic', t => {
  t.plan(2);
  const warningSpy = spy(console, 'error');
  const epic = (actions, getState) => {
    getState();
    getState();
    return Observable.of({ type: 'foo' });
  };
  const epicMiddleware = createEpic(epic);
  const dispatch = x => x;
  const getState = () => 4;
  epicMiddleware({ dispatch, getState })(x => x)({ type: 'foo' });
  epicMiddleware.end();
  t.true(
    warningSpy.calledOnce,
    'warning was called'
  );
  t.true(
    (/mock store/g).test(warningSpy.getCall(0).args[0]),
    'warning was called with message'
  );
  console.error.restore();
});

test('warn when non-action elements are sent', t => {
  t.plan(2);
  const warningSpy = spy(console, 'error');
  const nullEpic = () => Observable.of(null, null);
  const epicMiddleware = createEpic(nullEpic);
  const dispatch = x => x;
  const getState = () => 4;
  epicMiddleware({ dispatch, getState })(x => x)({ type: 'foo' });
  epicMiddleware.end();
  t.true(
    warningSpy.calledOnce,
    'warning was called'
  );
  t.true(
    (/pass null to the dispatch/g).test(warningSpy.getCall(0).args[0]),
    'warning was called with message'
  );
  console.error.restore();
});
