import React from 'react';
import PropTypes from 'prop-types';

import SomethingWentWrong from '../pages/SomethingWentWrong';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: null,
    };
  }

  static getDerivedStateFromError(/*error*/) {
    return { hasError: true };
  }

  // componentDidCatch(error, errorInfo){
  //     console.log(error)
  //     console.log(errorInfo)
  // }

  render() {
    if (this.state.hasError) {
      return <SomethingWentWrong />;
    }
    return this.props.children;
  }
}

ErrorBoundary.propTypes = {
  children: PropTypes.any,
};

export default ErrorBoundary;
