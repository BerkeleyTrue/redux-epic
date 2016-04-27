# Redux-Epic

> Better async in Redux with SSR data pre-fetching

Redux-Epic is a library built to do complex/async side-effects and
server side rendering(SSR) data pre-fetching using RxJS.

## Current Async story in Redux

There are currently two different modes of handling side-effects in Redux. The
first is to dispatch actions that are functions or actions that contain some sort
of data structure. Here are some common examples:

* [redux-thunks](https://github.com/gaearon/redux-thunk): dispatch action creators (functions) instead of plain action objects
* [redux-promise](https://github.com/acdlite/redux-promise): dispatch promises(or actions containing promises) that are converted to actions

The downside of these two libraries: you are no longer dispatching plain
serializable action objects.

The second and cleaner mode is taken by [redux-saga](https://github.com/yelouafi/redux-saga).
You create sagas (generator functions) and the library converts those sagas to redux middleware.
You then dispatch actions normally and the sagas react to those actions.

## Redux-Epic makes async better

While Redux-Saga is awesome and a source of inspiration for this library,
I've never been sold on generators themselves. They are a great way to create
long lived iterables (you pull data out of them), it just doesn't make sense
when you want something to push data to you instead. Iterables (generators create iterables)
are by definition not reactive but interactive. They require something to be
constantly polling (pulling data out) them until they complete.

On the other hand, Observables are reactive! Instead of polling the iterable, we
just wait for new actions from our observables and dispatch as normal.

## Why create Redux-Epic?

* Observables are powerful and proven
    * Allows Redux-Epic to offer a smaller API surface
    * Allows us to easily do server side rendering with data pre-fetching

* The Saga approach is a cleaner API
  * Action creators are plain mapping functions. In other words, they take in data
    and output actions
  * Components are can be plain mapping functions. Take in data and output html.
  * Complex/Async application logic lives in sagas.

* Server Side Rendering depends on async side-effects, which is why it's built into
  Redux-Epic

Observables offer a powerful and functional API. With Redux-Epic we take
advantage of this built in power and leave our specific API as small as
possible.


## API

> Using [rtype](https://github.com/ericelliott/rtype) typing signatures

### Contain

Creates a [Hgher Order Component](https://medium.com/@dan_abramov/mixins-are-dead-long-live-higher-order-components-94a0d2f9e750#.qoukwp2kc)
around your React Component. Should be combined with Redux's `connect`.

```js
interface Options {
  fetchAction?: ActionCreator,
  getActionArgs?(props: Object, context: Object) => [],
  isPrimed?(props: Object, context: Object) => Boolean,
  shouldRefetch?(
    props: Object,
    nextProps: Object,
    context: Object,
    nextContext: Object
  ) => Boolean,
}

interface contain {
  (options?: Options, Component: ReactComponent) => ReactComponent
  (options?: Object) => (Component: ReactComponent) => ReactComponent
}
```

### createEpic

Creates an epic middleware to be passed into Redux createStore

```js
Saga(
  action$: Observable[Action],
  getState: () => Object,
  dependencies: Object
) => Observable[Action]

interface EpicMiddleware {
  ({
    dispatch: Function,
    getState: Function
  }) => next: Function => action: Action => Action,
  // used to dispose sagas
  dispose() => Void,

  // the following are internal methods
  // they may change without warning
  restart() => Void,
  end() => Void,
  subscribe() => Disposable,
  subscribeOnCompleted() => Disposable,

}

createEpic(depndencies: Object|Saga, ...sagas: Saga[]) => EpicMiddleware
```

### render-to-string

Used for SSR. Ensures all the stores are populated before running React's
renderToString internally.

```js
renderToString(Component: ReactComponent, epicMiddleware: EpicMiddleware) => Observable[String]
```

### render


Optional: Wraps `react-doms` render method in an observable.

```js
render(Component: ReactComponent, DomContainer: DOMNode) => Observable[RootInstance]
```

## What are Observables?

The shortest answer I've found that makes the most sense:

> Observables are like a special function that can `return` multiple items over time.

Another answer that comes up a lot:

 * Observables are like lazy promises that can return more than once.

This analogy falls short, though. Promises are always async. Observables can be
either. Promises are immediate. Observables are lazy, they don't do anything
until someone is listening to them.

But the best answers out there aren't really short. The best intro I've seen out there is Ben Lesh's
[Learning Observables by building Obervables](https://medium.com/@benlesh/learning-observable-by-building-observable-d5da57405d87).
(it's also in video form on [Egghead.io](https://egghead.io/lessons/rxjs-creating-observable-from-scratch)).



## Don't use Observables, yet?

Moving to Observables is a big step and often requires some convincing. But rest
assure that the trade off is worth it. Observable make not only async but
complex synchronous logic trivial.

I can give an example of how trivial it was to implement a database query that
had a long-lived timed cache feature based on [this
 gist](https://gist.github.com/trajakovic/3b0239cae11e23c76b80).

```js
// timeCache operator module
import Rx, { AsyncSubject, Observable } from 'rx';
import moment from 'moment';

// timeCache(time: Number, units: String) => Observable
export function timeCache(time, units) {
  const source = this;
  let cache;
  let expireCacheAt;
  return Observable.create(observable => {
    // if there is no expire time set
    // or if expireCacheAt is smaller than now,
    // set new expire time in MS and create new subscription to source
    if (!expireCacheAt || expireCacheAt < Date.now()) {
      // set expire in ms;
      expireCacheAt = moment().add(time, units).valueOf();
      cache = new AsyncSubject();
      source.subscribe(cache);
    }
    return cache.subscribe(observable);
  });
}
```

```js
// get the number of user from the database
// cache for two hours, then refresh
// getUserCount(User: UserModel) => Observable[Number]
function getUserCount(User, cert) {
  // User.count returns an observable

  // using This-Bind operator
  return User.count()::timeCache(2, 'hours');
  // or plain es5
  // return timeCache.call(userCount(), 2, 'hours');
}

export function aboutRouter(app) {
  const userCount$ = getUserCount(app.models.User);
  app.use('/about', function about(req, res, next) {
    userCount.subscribe(
      userCount => {
        res.render('about', { userCount });
      },
      err => next(err);
    );
  });
}
```
