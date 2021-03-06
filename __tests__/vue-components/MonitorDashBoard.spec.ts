import vueStore from '@/store/index.ts'
import { shallowMount, createLocalVue } from '@vue/test-utils'
import VueRouter from 'vue-router'
import iView from 'iview'
// @ts-ignore
import MonitorDashBoard from '@/views/monitor/monitor-dashboard/MonitorDashBoard.vue'

const localVue = createLocalVue()
localVue.use(VueRouter)
localVue.use(iView);
const router = new VueRouter()

describe('MonitorDashBoard', () => {
    let store
    beforeEach(() => {
            store = vueStore
        }
    )
it('Component MonitorDashBoard is not null', () => {
    const wrapper = shallowMount(MonitorDashBoard, {
        mocks: {
            $t: (msg) => msg
        },localVue,
        router,store
    })
    expect(wrapper).not.toBeNull()
})})

