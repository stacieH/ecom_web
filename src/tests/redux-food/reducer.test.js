import reducers from '../../redux/reducer'
import * as actions from '../../redux/action'

describe('all reducer', ()=>{
    it('Sample Get Foods',()=>{
        const foods = [
            {id:1, name:'food1', description:'lipsum'},
            {id:2, name:'food2', description:'lipsum'},
            {id:3, name:'food3', description:'lipsum'},
        ]
        const initialState = []
        const action = {
            type: actions.SET_FOODS,
            foods
        }
        const REDUCER_SET_FOODS = reducers(initialState, action)
        expect(REDUCER_SET_FOODS).toHaveProperty('main.foods',foods)
        expect(REDUCER_SET_FOODS).toHaveProperty('main.isFoodLoading',true)
    })
})