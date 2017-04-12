import invariant from 'invariant';
import warning from 'warning';
import { CompositeDisposable, Observable, Subject } from 'rx';

import ofType from './of-type.js';

function addOutputWarning(source, name) {
  let actionsOutputWarned = false;
  return source.do(action => {
    warning(
      actionsOutputWarned || action && typeof action.type === 'string',
      `
        Future versions of redux-epic will pass all items to the dispatch
        function.
        Make sure you intented to pass ${action} to the dispatch or you
        filter out non-action elements at the individual epic level.
        Check the ${name} epic.
      `
    );
    actionsOutputWarned = !(action && typeof action.type === 'string');
  });
}

function createMockStore(store, name) {
  let mockStoreWarned = false;
  function mockStore() {
    warning(
      mockStoreWarned,
      `
        The second argument to an epic is now a mock store,
        but it was called as a function. Pull the getState method off
        of the second argument of the epic instead.
        Check the ${name} epic.

        Epic type signature:
        epic(
          actions: Observable[...Action],
          { dispatch: Function, getState: Function }
        ) => Observable[...Action]
      `
    );
    mockStoreWarned = true;
    return store.getState();
  }
  mockStore.getState = store.getState;
  mockStore.dispatch = store.dispatch;
  return mockStore;
}
// Epic(
//   actions: Observable[...Action],
//   getState: () => Object,
//   dependencies: Object
// ) => Observable[...Action]
//
// interface EpicMiddleware {
//   ({
//     dispatch: Function,
//     getState: Function
//   }) => next: Function => action: Action => Action,
//   // used to dispose sagas
//   dispose() => Void,
//
//   // the following are internal methods
//   // they may change without warning
//   restart() => Void,
//   end() => Void,
//   subscribe() => Disposable,
//   subscribeOnCompleted() => Disposable,
//
// }
//
// createEpic(
//   dependencies: Object|Epic,
//   ...epics: [...Epics]
// ) => EpicMiddleware

export default function createEpic(dependencies, ...epics) {
  if (typeof dependencies === 'function') {
    epics.push(dependencies);
    dependencies = {};
  }
  let actions;
  let lifecycle;
  let compositeDisposable;
  let start;
  function epicMiddleware(store) {
    const { dispatch } = store;

    start = () => {
      compositeDisposable = new CompositeDisposable();
      actions = new Subject();
      lifecycle = new Subject();
      actions.ofType = ofType;
      const epicSubscription = Observable
        .from(epics)
        // need to test for pass-through sagas
        .map(epic => {
          const name = epic.name || 'Anon Epic';
          const result = epic(
            actions,
            createMockStore(store, name),
            dependencies
          );
          invariant(
            Observable.isObservable(result),
            `
              Epics should returned an observable but got %s
              Check the ${name} epic
            `,
            result
          );
          invariant(
            result !== actions,
            `
              Epics should not be identity functions.
              Check the ${name} epic
            `
          );
          return addOutputWarning(result, name);
        })
        .mergeAll()
        .filter(action => action && typeof action.type === 'string')
        .subscribe(
          action => dispatch(action),
          err => { throw err; },
          () => lifecycle.onCompleted()
        );
      compositeDisposable.add(epicSubscription);
    };
    start();
    return next => action => {
      const result = next(action);
      actions.onNext(action);
      return result;
    };
  }

  epicMiddleware.subscribe =
    (...args) => lifecycle.subscribe.apply(lifecycle, args);
  epicMiddleware.subscribeOnCompleted =
    (...args) => lifecycle.subscribeOnCompleted.apply(lifecycle, args);
  epicMiddleware.end = () => actions.onCompleted();
  epicMiddleware.dispose = () => compositeDisposable.dispose();
  epicMiddleware.restart = () => {
    epicMiddleware.dispose();
    actions.dispose();
    start();
  };
  return epicMiddleware;
}
