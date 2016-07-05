/* eslint-disable react/no-multi-comp */
import test from 'ava';
import sinon from 'sinon';
import React from 'react';
import { shallow } from 'enzyme';
import { contain } from '../src';

test('contain', t => {
  t.is(
    typeof contain,
    'function',
    'contain is a function'
  );
});

test('contain() should return a function', t => {
  t.is(
    typeof contain(),
    'function'
  );
  t.is(
    typeof contain({}),
    'function'
  );
});

test('contain should wrap a component', t => {
  class Test extends React.Component {
    render() {
      return <h1>test</h1>;
    }
  }
  Test.displayName = 'Test';

  const Contained = contain({})(Test);
  t.is(typeof Contained, 'function');
  t.is(typeof Contained.prototype.render, 'function');
  t.not(Contained.prototype.render, Test.prototype.render);
  const wrapper = shallow(<Contained />);
  t.truthy(wrapper.find('Test'));
});

test('container should call fetch action when defined', t => {
  const testActionCreator = sinon.spy();
  const options = { fetchAction: 'testActionCreator' };
  class Test extends React.Component {
    render() {
      return <h1>test</h1>;
    }
  }
  Test.displayName = 'Test';

  const Contained = contain(options)(Test);
  shallow(
    <Contained testActionCreator={ testActionCreator } />
  );
  t.truthy(testActionCreator.calledOnce);
});

test('container should throw if fetchAction is undefined', t => {
  const options = { fetchAction: 'testActionCreator' };
  class Test extends React.Component {
    render() {
      return <h1>test</h1>;
    }
  }
  Test.displayName = 'Test';

  const Contained = contain(options)(Test);
  t.throws(
    () => shallow(<Contained />),
    /should be a function on Contain/
  );
});

test('container should not fetch if primed', t => {
  const fetch = sinon.spy();
  const isPrimed = sinon.spy(() => true);
  const options = {
    fetchAction: 'fetch',
    isPrimed
  };
  class Test extends React.Component {
    render() {
      return <h1>test</h1>;
    }
  }
  Test.displayName = 'Test';

  const Contained = contain(options)(Test);
  shallow(<Contained fetch={ fetch }/>);
  t.false(fetch.called);
  t.true(isPrimed.calledOnce);
});

test('container should throw if getActionArgs does not return an array', t => {
  const fetch = sinon.spy();
  const getActionArgs = sinon.spy(() => {});
  const options = {
    fetchAction: 'fetch',
    getActionArgs
  };
  class Test extends React.Component {
    render() {
      return <h1>test</h1>;
    }
  }
  Test.displayName = 'Test';

  const Contained = contain(options)(Test);
  t.throws(
    () => shallow(<Contained fetch={ fetch }/>),
    /getActionArgs should always return an array/
  );
});

test('container should call action creator with args', t => {
  const fetch = sinon.spy();
  const foo = 'foo';
  const getActionArgs = sinon.spy(() => [foo]);
  const options = {
    fetchAction: 'fetch',
    getActionArgs
  };
  class Test extends React.Component {
    render() {
      return <h1>test</h1>;
    }
  }
  Test.displayName = 'Test';

  const Contained = contain(options)(Test);
  shallow(<Contained fetch={ fetch }/>);
  t.true(fetch.calledWith(foo));
});

test('container should call shouldRefetch', t => {
  const fetch = sinon.spy();
  const shouldRefetch = sinon.spy(() => true);
  const options = {
    fetchAction: 'fetch',
    shouldRefetch
  };
  class Test extends React.Component {
    render() {
      return <h1>test</h1>;
    }
  }
  Test.displayName = 'Test';

  const Contained = contain(options)(Test);
  const rootWrapper = shallow(<Contained fetch={ fetch }/>);
  t.true(fetch.calledOnce);
  rootWrapper.setProps({});
  t.true(fetch.calledTwice);
});
