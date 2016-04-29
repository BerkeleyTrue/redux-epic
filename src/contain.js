import React from 'react';
import { helpers } from 'rx';
import { createElement } from 'react';
import shallowCompare from 'react-addons-shallow-compare';
import debug from 'debug';
import invariant from 'invariant';

// // Using rtype signatures
// interface Action {
//   type: String,
//   payload?: Any,
//   ...meta?: Object
// }
//
// ActionCreator(...args?) => Action
//
// interface Options {
//   fetchAction?: ActionCreator,
//   getActionArgs?(props: Object, context: Object) => [],
//   isPrimed?(props: Object, context: Object) => Boolean,
//   shouldRefetch?(
//     props: Object,
//     nextProps: Object,
//     context: Object,
//     nextContext: Object
//   ) => Boolean,
// }
//
// interface contain {
//   (options?: Options, Component: ReactComponent) => ReactComponent
//   (options?: Object) => (Component: ReactComponent) => ReactComponent
// }


const log = debug('redux-epic:contain');
const { isFunction } = helpers;

export default function contain(options = {}, Component) {
  /* istanbul ignore else */
  if (!Component) {
    return contain.bind(null, options);
  }

  let action;
  let isActionable = false;
  let hasRefetcher = isFunction(options.shouldRefetch);
  const getActionArgs = isFunction(options.getActionArgs) ?
    options.getActionArgs :
    (() => []);

  const isPrimed = isFunction(options.isPrimed) ?
    options.isPrimed :
    (() => false);

  const name = Component.displayName || 'Anon Component';

  function runAction(props, context, action) {
    const actionArgs = getActionArgs(props, context);
    invariant(
      Array.isArray(actionArgs),
      `${name} getActionArgs should return an array but got ${actionArgs}`
    );
    return action.apply(null, actionArgs);
  }


  return class Container extends React.Component {
    static displayName = `Container(${name})`;

    componentWillMount() {
      const { props, context } = this;
      if (!options.fetchAction) {
        log(`${name} has no fetch action defined`);
        return;
      }
      if (isPrimed(this.props, this.context)) {
        log(`${name} container is primed`);
        return;
      }

      action = props[options.fetchAction];
      isActionable = typeof action === 'function';

      invariant(
        isActionable,
        `${options.fetchAction} should return a function but got ${action}.
          Check the fetch options for ${name}.`
      );

      runAction(
        props,
        context,
        action
      );
    }

    componentWillReceiveProps(nextProps, nextContext) {
      if (
        !isActionable ||
        !hasRefetcher ||
        !options.shouldRefetch(this.props, nextProps, this.context, nextContext)
      ) {
        return;
      }

      runAction(
        nextProps,
        nextContext,
        action
      );
    }

    shouldComponentUpdate(nextProps, nextState) {
      return shallowCompare(this, nextProps, nextState);
    }

    render() {
      return createElement(
        Component,
        this.props
      );
    }
  };
}
