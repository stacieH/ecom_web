import React, { Fragment } from 'react'
import '../styles/animate.css'

function LoadingCard(){
    return(
        <Fragment>
            <div className='card'>
                <div className='product-image animate-pulse' style={{backgroundColor:'#e8e8e8'}}/>
                <div className='product-details animate-pulse'>
                    <div className='label' style={{backgroundColor:'#e8e8e8', width:'100%', height:21}}> </div>
                    {/* <br/> */}
                    <div className='source' style={{backgroundColor:'#e8e8e8', width:'30%', height:16, marginTop:2}}> </div>
                </div>
                <div className='source animate-pulse' style={{backgroundColor:'#e8e8e8', width:70, height:20}}> </div>
            </div>
        </Fragment>
    )
}

export default LoadingCard