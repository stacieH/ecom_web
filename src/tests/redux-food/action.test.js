import * as actions from '../../redux/action'

describe('all action creators', ()=>{
    it('should returns an action object for setFoods',()=>{
        const toTest = actions.setFoods(foods)
        const expectedResult = {
            type: actions.SET_FOODS,
            foods
        }
        expect(toTest).toEqual(expectedResult)
    })
    it('should returns an action object for removeItem',()=>{
        const expectedResult = {
            type: actions.REMOVE_ITEM,
            id
        }
        expect(actions.removeItem(id)).toEqual(expectedResult)
    })
    it('should returns an action object for addItem',()=>{
            const added_item = {id:3, name:'food3', description:'lipsum'}
            const expectedResult = {
            type: actions.ADD_ITEM,
            payload: added_item
        }
        expect(actions.addItem(added_item)).toEqual(expectedResult)
    })
    it('should returns an action object for filterItem',()=>{
        const passed_actions = { direction:'descending', sort_by: 'name' }
        const expectedResult = {
            type: actions.FILTER_ITEM,
            cart: [
                {id:3, name:'food3', description:'lipsum'},
                {id:2, name:'food2', description:'lipsum'},
                {id:1, name:'food1', description:'lipsum'},
            ]
        }
        const toTest = actions.filterItem(foods, passed_actions)
        expect(toTest).toEqual(expectedResult)
    })
})

const foods = [
    {id:1, name:'food1', description:'lipsum'},
    {id:2, name:'food2', description:'lipsum'},
    {id:3, name:'food3', description:'lipsum'},
]
const id = 2

