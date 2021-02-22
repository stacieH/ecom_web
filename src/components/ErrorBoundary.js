import React from 'react'
import PropTypes from 'prop-types'

import WentWrongPage from './WentWrongPage'

class ErrorBoundary extends React.Component{
    constructor(props){
        super(props)
        this.state={
            hasError: null
        }
    }

    static getDerivedStateFromError(/*error*/){
        return {hasError: true}
    }

    // componentDidCatch(error, errorInfo){
    //     console.log(error)
    //     console.log(errorInfo)
    // }

    render(){
        if(this.state.hasError){
            return (
                <WentWrongPage />
            )
        }
        return this.props.children
    }
}

ErrorBoundary.propTypes={
    children:PropTypes.any
}

export default ErrorBoundary