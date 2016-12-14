# API

This document uses [rtype](https://github.com/ericelliott/rtype) for type signatures.

## createEpic

Creates an epic middleware to be passed into Redux createStore

```js
Epic(
  actions: Observable[ ...Action ],
  {
    getState: () => Object
  },
  dependencies: Object
) => Observable[ ...Any ]

interface EpicMiddleware {
  ({
    dispatch: Function,
    getState: Function
  }) => ( (next: Function) => (action: Action) => Action ),
  // used to dispose epics
  dispose() => Void
}

interface createEpic {
  (dependencies: Object, ...epics: [ Epic... ]) => EpicMiddleware
  (...epics: [ Epic... ]) => EpicMiddleware
}
```

## Contain

Creates a [Hgher Order Component (HOC)](https://medium.com/@dan_abramov/mixins-are-dead-long-live-higher-order-components-94a0d2f9e750#.qoukwp2kc)
around your React Component. This can be combined with Redux's `connect` HOC.

```js
interface Options {
  fetchAction?: ActionCreator,
  getActionArgs?(props: Object, context: Object) => [ ...Any ],
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
A simple example:

```js
import React from 'react';
import { connect } from 'react-redux';
import { contain } from 'redux-epic';

class ShowUser extends React.Component {
  render() {
    const { user = {} } = this.props;
    return (
      <h1>UserName: { user.name }</h1>
    );
  }
}

const containComponent = contain({
  // this is the action we want the
  // container to call when this component
  // is going to be mounted
  fetchAction: 'fetchUser',
  // these are the arguments to call the action creator
  getActionArgs(props) {
    return [ props.params.userId ];
  }
});

const connectComponent = connect(
  state => ({ user: state.user }), //
  { fetchUser: userId => ({ type: 'FETCH_USER', payload: userId }) }
);

// connect will provide the data from state and the binded actionCreator
// contain will handle data fetching
export default connectComponent(containComponent(ShowUser));
```


## render-to-string

Used when you want your server-side rendered app to be fully populated.

Ensures all the stores are populated before running React's renderToString internally.
This will end the actions$ observable and wait for
all of the epics to complete.

```js
renderToString(Component: ReactComponent, epicMiddleware: EpicMiddleware) => Observable[String]
```

## render


Optional: Wraps `react-doms` render method in an observable.

```js
render(Component: ReactComponent, DomContainer: DOMNode) => Observable[ RootInstance ]
```
