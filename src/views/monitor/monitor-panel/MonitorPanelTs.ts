import {Message} from "@/config/index.ts"
import {market} from "@/core/api/logicApi.ts"
import {KlineQuery} from "@/core/query/klineQuery.ts"
import {Address} from 'nem2-sdk'
import {MosaicApiRxjs} from '@/core/api/MosaicApiRxjs.ts'
import {AccountApiRxjs} from '@/core/api/AccountApiRxjs.ts'
import {Component, Vue, Watch} from 'vue-property-decorator'
import monitorSeleted from '@/common/img/monitor/monitorSeleted.png'
import monitorUnselected from '@/common/img/monitor/monitorUnselected.png'
import {copyTxt, formatXEMamount, formatNumber} from '@/core/utils/utils.ts'
import {mapState} from "vuex"
import {minitorPanelNavigatorList} from '@/config/index.ts'

@Component({
    computed: {
        ...mapState({
            activeAccount: 'account',
            app: 'app',
        })
    }
})
export class MonitorPanelTs extends Vue {
    app: any
    activeAccount: any
    mosaic: string
    mosaicName = ''
    // @TODO: current price in the store
    currentPrice = 0
    isShowAccountInfo = true
    isShowAccountAlias = false
    isShowManageMosaicIcon = false
    monitorSeleted = monitorSeleted
    monitorUnselected = monitorUnselected
    navigatorList: any = minitorPanelNavigatorList

    get isLoadingBalance() {
        return this.app.balanceLoading
    }

    get isLoadingMosaic() {
        return this.app.mosaicsLoading
    }

    get mosaicMap() {
        return this.activeAccount.mosaicMap
    }

    get getWallet() {
        return this.activeAccount.wallet
    }

    get XEMamount() {
        return this.activeAccount.wallet.balance
    }

    get address() {
        return this.activeAccount.wallet.address
    }

    get node() {
        return this.activeAccount.node
    }

    get currentXEM1() {
        return this.activeAccount.currentXEM1
    }

    get currentXEM2() {
        return this.activeAccount.currentXEM2
    }

    switchPanel(index) {
        if (this.navigatorList[index].disabled) {
            return
        }
        const list = this.navigatorList.map((item) => {
            item.isSelect = false
            return item
        })
        list[index].isSelect = true
        this.navigatorList = list
        this.$router.push({
            name: list[index].path
        })
    }

    hideAssetInfo() {
        this.isShowAccountInfo = false
    }

    manageMosaicList() {
        this.isShowManageMosaicIcon = !this.isShowManageMosaicIcon
    }

    copyAddress() {
        const that = this
        copyTxt(this.address).then(() => {
            that.$Notice.success(
                {
                    title: this.$t(Message.COPY_SUCCESS) + ''
                }
            )
        })
    }

    // @TODO: probably not necessary
    initData() {
        this.$store.commit('SET_CURRENT_PANEL_INDEX', 0)
    }

    showMosaicMap() {
        this.isShowManageMosaicIcon = !this.isShowManageMosaicIcon
    }

    toggleShowMosaic(key, value) {
        const updatedMap = {...this.mosaicMap}
        if (!updatedMap[key]) return
        const updatedMosaic = {...value}
        updatedMosaic.show = !updatedMosaic.show
        updatedMap[key] = updatedMosaic
        this.$store.commit('SET_MOSAIC_MAP', updatedMap)
    }

    getAccountsName() {
        const that = this
        const {address, node} = this
        if (!address || address.length < 40) return
        new AccountApiRxjs().getAccountsNames([Address.createFromRawAddress(address)], node).subscribe((namespaceInfo) => {
            if (namespaceInfo[0].names.length > 0) {
                that.isShowAccountAlias = true
            } else {
                that.isShowAccountAlias = false
            }
        }, () => {
            that.isShowAccountAlias = false
        })

    }

    async getMarketOpenPrice() {
        try {
            const rstStr = await market.kline({period: "1min", symbol: "xemusdt", size: "1"})
            const rstQuery: KlineQuery = JSON.parse(rstStr.rst)
            const result = rstQuery.data ? rstQuery.data[0].close : 0
            this.currentPrice = result
        } catch (error) {
            setTimeout(() => this.getMarketOpenPrice(), 10000)
        }
    }

    formatNumber(number) {
        return formatNumber(number)
    }

    initLeftNavigator() {
        this.$store.commit('SET_CURRENT_PANEL_INDEX', 0)
    }

    searchMosaic() {
        // need hex search way
        const that = this
        const {mosaicName, mosaicMap, currentXEM1, currentXEM2} = this
        const {} = this
        if (this.mosaicName == '') {
            this.showErrorMessage(Message.MOSAIC_NAME_NULL_ERROR)
            return
        }
        let searchResult = {}
        const mosaicHex = new MosaicApiRxjs().getMosaicByNamespace(mosaicName).id.toHex()
        if (mosaicMap[mosaicHex]) {
            searchResult[mosaicHex] = mosaicMap[mosaicHex]
            // that.mosaicMap = searchResult
            return
        }
        if (mosaicHex == currentXEM1 || currentXEM2 == mosaicHex) {
            searchResult[mosaicHex] = mosaicMap[currentXEM1] ? mosaicMap[currentXEM1] : mosaicMap[currentXEM2]
            // that.mosaicMap = searchResult
            return
        }
        searchResult[mosaicHex] = {
            name: mosaicName,
            hex: mosaicHex,
            amount: 0,
            show: false,
            showInManage: true
        }
        // that.mosaicMap = searchResult
    }

    showErrorMessage(message) {
        this.$Notice.destroy()
        this.$Notice.error({title: this.$t(message) + ''})
    }

    setLeftSwitchIcon() {
        this.$store.commit('SET_CURRENT_PANEL_INDEX', 0)
    }

    formatXEMamount(text) {
        return formatXEMamount(text)
    }

    @Watch('getWallet')
    onGetWalletChange(n, o) {
        if (!n.address || n.address === o.address) return
        this.initData() // @TODO: probably not necessary
        this.getAccountsName()
        this.getMarketOpenPrice()
    }

    @Watch('mosaicName')
    onMosaicNameChange() {
        // @TODO: do not mutate mosaicMap outside of a mutation handler
        // @TODO: make a new Set() {mosaicMapKey: show: bool} instead
        const {mosaicMap, mosaicName} = this
        for (const item in mosaicMap) {
            if (item.indexOf(mosaicName) !== -1 || mosaicMap[item].name.indexOf(mosaicName) !== -1) {
                mosaicMap[item].showInManage = true
                continue
            }
            mosaicMap[item].showInManage = false
        }
    }

    mounted() {
        this.switchPanel(0)
        this.setLeftSwitchIcon()
        this.initLeftNavigator()
        this.initData() // @TODO: probably not necessary
        this.getMarketOpenPrice()
        // Functions hereunder should probably not be here
        this.getAccountsName()
    }
}
