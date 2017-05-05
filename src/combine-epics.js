// source
// github.com/redux-observable/redux-observable/blob/master/src/combineEpics.js
import { Observable } from 'rx';

export default function combineEpics(...epics) {
  return (...args) => Observable.merge(...epics.map(epic => {
    const output = epic(...args);
    if (!output) {
      throw new TypeError(`
        combineEpics: one of the provided Epics
        "${epic.name || '<anonymous>'}" does not return a stream.
        Double check you're not missing a return statement!
      `);
    }
    return output;
  }));
}
