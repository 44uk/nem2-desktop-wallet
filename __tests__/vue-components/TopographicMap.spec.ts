import Vuex from 'vuex'
import vueStore from '@/store/index.ts'
import { shallowMount, createLocalVue } from '@vue/test-utils'
import VueRouter from 'vue-router'
import iView from 'iview'
const localVue = createLocalVue()
localVue.use(VueRouter)
localVue.use(iView);
const router = new VueRouter()
// @ts-ignore
import TopographicMap from '@/views/service/multisig/multisig-functions/multisig-map/TopographicMap.vue'


describe('TopographicMap', () => {
    let store
    beforeEach(() => {
            store = vueStore
        }
    )
it('Component TopographicMap is not null', () => {
    const wrapper = shallowMount(TopographicMap, {
        mocks: {
            $t: (msg) => msg
        },localVue,
        router,store
    })
    expect(wrapper).not.toBeNull()
})})

