import React from 'react';
import React, {addons} from 'react';
import React, {addons, PropTypes} from 'react';

const {addons: {PureRenderMixin}} = React;
const {addons: {PureRenderMixin, CSSTransitionGroup}} = React;

const {PureRenderMixin} = React.addons;
const {PureRenderMixin, CSSTransitionGroup} = React.addons;

const {PureRenderMixin} = addons;
const {PureRenderMixin, CSSTransitionGroup} = addons;

export default React.createClass({

  mixins: [
    LinkedStateMixin,
    addons.LinkedStateMixin,
    React.addons.LinkedStateMixin
  ],

  render() {
    return (
      <React.addons.CSSTransitionGroup>
        <addons.TransitionGroup>
          <CSSTransitionGroup>
            <div />
          </CSSTransitionGroup>
        </addons.TransitionGroup>
      </React.addons.CSSTransitionGroup>
    );
  }

});
