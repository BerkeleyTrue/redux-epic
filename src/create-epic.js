import invariant from 'invariant';
import { CompositeDisposable, Observable, Subject } from 'rx';

// Saga(
//   action$: Observable[Action],
//   getState: () => Object,
//   dependencies: Object
// ) => Observable[Action]
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
//   depndencies: Object|Saga,
//   ...sagas: Saga[]
// ) => EpicMiddleware

export default function createEpic(dependencies, ...sagas) {
  if (typeof dependencies === 'function') {
    sagas.push(dependencies);
    dependencies = {};
  }
  let action$;
  let lifecycle;
  let compositeDisposable;
  let start;
  function epicMiddleware({ dispatch, getState }) {
    start = () => {
      compositeDisposable = new CompositeDisposable();
      action$ = new Subject();
      lifecycle = new Subject();
      const sagaSubscription = Observable
        .from(sagas)
        // need to test for pass-through sagas
        .map(saga => saga(action$, getState, dependencies))
        .doOnNext(result$ => {
          invariant(
            Observable.isObservable(result$),
            'saga should returned an observable but got %s',
            result$
          );
          invariant(
            result$ !== action$,
            'saga should not be an identity function'
          );
        })
        .mergeAll()
        .filter(action => action && typeof action.type === 'string')
        .subscribe(
          action => dispatch(action),
          err => { throw err; },
          () => lifecycle.onCompleted()
        );
      compositeDisposable.add(sagaSubscription);
    };
    start();
    return next => action => {
      const result = next(action);
      action$.onNext(action);
      return result;
    };
  }

  epicMiddleware.subscribe =
    (...args) => lifecycle.subscribe.apply(lifecycle, args);
  epicMiddleware.subscribeOnCompleted =
    (...args) => lifecycle.subscribeOnCompleted.apply(lifecycle, args);
  epicMiddleware.end = () => action$.onCompleted();
  epicMiddleware.dispose = () => compositeDisposable.dispose();
  epicMiddleware.restart = () => {
    epicMiddleware.dispose();
    action$.dispose();
    start();
  };
  return epicMiddleware;
}
