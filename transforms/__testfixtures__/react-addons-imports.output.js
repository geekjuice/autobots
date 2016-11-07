import React from 'react';
import PureRenderMixin from 'react-addons-pure-render-mixin';
import CSSTransitionGroup from 'react-addons-css-transition-group';
import LinkedStateMixin from 'react-addons-linked-state-mixin';
import TransitionGroup from 'react-addons-transition-group';
import React from 'react';
import React, {PropTypes} from 'react';

export default React.createClass({

  mixins: [
    LinkedStateMixin,
    LinkedStateMixin,
    LinkedStateMixin
  ],

  render() {
    return (
      <CSSTransitionGroup>
        <TransitionGroup>
          <CSSTransitionGroup>
            <div />
          </CSSTransitionGroup>
        </TransitionGroup>
      </CSSTransitionGroup>
    );
  }

});
