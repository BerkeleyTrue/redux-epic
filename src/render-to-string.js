import { Observable } from 'rx';
import ReactDOM from 'react-dom/server';
import debug from 'debug';

const log = debug('redux-epic:renderToString');

// renderToString(
//   Component: ReactComponent,
//   epicMiddleware: EpicMiddleware
// ) => Observable[String]

export default function renderToString(Component, epicMiddleware) {
  try {
    log('initial render pass started');
    ReactDOM.renderToStaticMarkup(Component);
    log('initial render pass completed');
  } catch (e) {
    return Observable.throw(e);
  }
  log('calling action$ onCompleted');
  epicMiddleware.end();
  return Observable.merge(epicMiddleware)
    .last({ defaultValue: null })
    .map(() => {
      epicMiddleware.restart();
      const markup = ReactDOM.renderToString(Component);
      return { markup };
    });
}
