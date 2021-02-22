import React from 'react'
import WentWrongImg from '../assets/crayon1528.png'

function WentWrongPage(){
    return(
        <div style={{display:'flex', justifyContent:'center', alignItems:'center'}}>
            <img src={WentWrongImg} alt='Something went wrong' width='25%' height='25%'/>
            <span>
                <h2>Something went wrong</h2>
                <small>Feel free to contact us, if refreshing doesn&apos;t work.</small>
            </span>
        </div>
    )
}

export default WentWrongPage