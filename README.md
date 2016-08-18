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
  * Action creators are plain map functions. In other words, they take in data
    and output actions
  * Components are can be plain mapping functions. Take in data and output html.
  * Complex/Async application logic lives in sagas.

* Server Side Rendering depends on async side-effects, which is why it's built into
  Redux-Epic

Observables offer a powerful and functional API. With Redux-Epic we take
advantage of this built in power and leave our specific API as small as
possible.

## Install

```bash
npm install --save redux-epic
```

## Basic Usage

Let's create a Saga, a function that returns an observable stream of actions,
that handles fetching user data

```js
// fetch-user-saga.js
import { Observable } from 'rx';
import fetchUser from 'my-cool-ajax-library';

export default function tickSaga(actions$) {
  return action$
    // only listen for the action we care about
    // this will be our trigger
    .filter(action.type === 'FETCH_USER')
    .flatMap(action => {
      const userId = action.payload;
      // fetchUser makes an ajax request and returns an observable
      return fetchUser(`/api/user/${userId}`)
        // turn the result of the ajax request
        // into an action
        .map(user => { return { type: 'UPDATE_USER', payload: { user: user } }; })
        // handle request errors with another action creator
        .catch(error => Observable.just({ type: 'FETCH_USER_ERROR', error: error }));
    });
}
```

Now to start using your newly created saga:

```js
import { createEpic } from 'redux-epic';
import { createStore, applyMiddleware } from 'redux'
import myReducer from './my-reducer'
import fetchUserSaga from './fetch-user-saga'

// createEpic can take any number of sagas
const epicMiddleware = createEpic(fetchUserSaga);

const store = createStore(
  myReducer,
  applyMiddleware(epicMiddleware);
);

```

And that's it! Your saga is now connected to redux store.
Now to trigger your saga, you just need to dispatch the
'FETCH_USER' action!

## [Docs](docs)

* [API](docs/api)
* [recipes](docs/recipes)

## Previous Art

This library is inspired by the following

* [Redux-Saga](https://github.com/yelouafi/redux-saga): Sagas built using generators
* [Redux-Saga-RxJS](https://github.com/salsita/redux-saga-rxjs): Sagas using RxJS (No longer maintained)

## Redux-Observable

It's come to my attention the recent changes to the library [redux-observable](https://github.com/redux-observable/redux-observable).

Initially redux-observable was very different from redux-epic. They took the same path as redux-thunk, redux-promise, and others where the observable (or promise, or function, or whatever) goes through the dispatch. This was distasteful to me, which is why I went the same route as redux-saga and redux-saga-rxjs, using middleware to intercept and dispatch actions in a fashion that fits the idioms of both Redux and Rx.

It looks like they independently came to the same conclusion in https://github.com/redux-observable/redux-observable/pull/55 and https://github.com/redux-observable/redux-observable/pull/67 and switched to an identical model as mine, even the same name! It's great that we both came to the same conclusions and validates my initial thoughts.

After a conversation with the authors of Redux-Observable, we've decided to join
forces. More details to come as to exactly how that would work.

I recommend using Redux-Observable over this library unless you need server side
data fetcing today.
