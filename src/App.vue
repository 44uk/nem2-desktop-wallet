<template>
  <div id="app" :class="[isWindows?'windows':'mac']">
    <router-view/>
  </div>
</template>

<script lang="ts">
    import 'animate.css'
    import {isWindows, Message, nodeConfig} from "@/config/index.ts"
    import {localRead, localSave, getRelativeMosaicAmount} from '@/core/utils/utils.ts'
    import {AppWallet, getMosaicList, getMosaicInfoList, getNamespaces} from '@/core/utils/wallet.ts'
    import {
        Listener, NamespaceHttp, NamespaceId, Address, MosaicHttp, MosaicId,
        PublicAccount, NetworkType, MosaicService, AccountHttp, UInt64, MosaicInfo, MosaicAlias
    } from "nem2-sdk"
    import {checkInstall} from '@/core/utils/electron.ts'
    import {AccountApiRxjs} from '@/core/api/AccountApiRxjs.ts'
    import {ListenerApiRxjs} from '@/core/api/ListenerApiRxjs.ts'
    import {Component, Vue, Watch} from 'vue-property-decorator'
    import {mapState} from 'vuex'
    import {BlockApiRxjs} from '@/core/api/BlockApiRxjs.ts'
    import {ChainListeners} from '@/core/services/listeners.ts'
    import {getNetworkGenerationHash, getCurrentNetworkMosaic} from '@/core/utils/network.ts'
    import {aliasType} from '@/config/index.ts'
    import {market} from "@/core/api/logicApi.ts"
    import {KlineQuery} from "@/core/query/klineQuery.ts"
    import {TransactionApiRxjs} from '@/core/api/TransactionApiRxjs.ts'
    import {transactionFormat} from '@/core/utils/format.ts'
    import {from, interval, asyncScheduler, of} from 'rxjs'
    import {toArray, flatMap, concatMap, map, tap, throttleTime, finalize, mergeMap} from 'rxjs/operators'
    import {AppMosaics} from '@/core/utils/mosaics'
    import {mosaicsAmountViewFromAddress} from '@/core/services/mosaics'

    @Component({
        computed: {
            ...mapState({activeAccount: 'account', app: 'app'}),
        },
    })
    export default class App extends Vue {
        isWindows = isWindows
        activeAccount: any
        app: any
        unconfirmedTxListener = null
        confirmedTxListener = null
        txStatusListener = null
        chainListeners: ChainListeners = null

        get node(): string {
            return this.activeAccount.node
        }

        get accountPublicKey() {
            return this.activeAccount.wallet.publicKey
        }

        get wallet(): any {
            return this.activeAccount.wallet
        }

        get currentXem() {
            return this.activeAccount.currentXem
        }

        get currentXEM1(): string {
            return this.activeAccount.currentXEM1
        }

        get currentXEM2(): string {
            return this.activeAccount.currentXEM2
        }

        get namespaceList() {
            return this.activeAccount.namespace
        }

        get preBlockInfo() {
            return this.app.chainStatus.preBlockInfo
        }

        get currentBlockInfo() {
            return this.app.chainStatus.currentBlockInfo
        }

        get currentNode() {
            return this.activeAccount.node
        }

        get networkCurrencies() {
            return [this.currentXEM1, this.currentXEM2]
        }

        get xemDivisibility() {
            return this.activeAccount.xemDivisibility
        }

        get accountAddress() {
            return this.activeAccount.wallet.address
        }

        get mosaic() {
            return this.activeAccount.mosaics
        }

        get transactionList() {
            return this.activeAccount.transactionList
        }

        // @TODO: move out from there
        async setWalletsList() {

            const walletListFromStorage: any = localRead('wallets') !== '' ? JSON.parse(localRead('wallets')) : false
            if (!walletListFromStorage || !walletListFromStorage.length) return
            AppWallet.switchWallet(walletListFromStorage[0].address, walletListFromStorage, this.$store)

        }

        // @TODO: move out from there
        async initMosaic(wallet) {
            const appMosaics = AppMosaics()
            appMosaics.init(this.mosaic)
            const address = Address.createFromRawAddress(wallet.address)

            let {accountAddress, node, currentXem} = this
            return new Promise(async (resolve, reject) => {
                try {
                    const mosaicAmountViews = await mosaicsAmountViewFromAddress(node, address)
                    console.log(mosaicAmountViews)
                    of(mosaicAmountViews)
                        .pipe(
                            mergeMap((_) => _),
                            map(mosaic => appMosaics.fromMosaicAmountView(mosaic, this.$store))
                        )
                        .toPromise()
                        new AppWallet(wallet).updateAccountBalance(this.mosaic[this.currentXEM1].balance, this.$store)
                        await Promise.all([
                            this.$store.commit('SET_BALANCE_LOADING', false),
                            this.$store.commit('SET_MOSAICS_LOADING', false),
                        ])
                        resolve(true)
                } catch (error) {
                    this.$store.commit('SET_MOSAICS_LOADING', false)
                    reject(error)   
                }
            })
        }

        // @TODO: move out from there
        async getMarketOpenPrice() {
            const that = this
            const rstStr = await market.kline({period: "1min", symbol: "xemusdt", size: "1"})
            if (!rstStr.rst) return
            const rstQuery: KlineQuery = JSON.parse(rstStr.rst)
            const result = rstQuery.data ? rstQuery.data[0].close : 0
            this.$store.commit('SET_XEM_USD_PRICE', result)
            const openPriceOneMinute = {
                timestamp: new Date().getTime(),
                openPrice: result
            }
            localSave('openPriceOneMinute', JSON.stringify(openPriceOneMinute))
        }

        //  @TODO: make it an AppWallet method
        //  need to be finished before starting confirmed listener
        //  Might be better to switchMap them together
        setTransactionList(address) {
            this.$store.commit('SET_TRANSACTIONS_LOADING', true)
            const that = this
            let {accountPublicKey, node} = this
            if (!accountPublicKey || accountPublicKey.length < 64) return
            const publicAccount = PublicAccount
                .createFromPublicKey(accountPublicKey, NetworkType.MIJIN_TEST)

            new TransactionApiRxjs().transactions(
                publicAccount,
                {
                    pageSize: 100
                },
                node,
            ).subscribe(async (transactionList) => {
                try {
                    const txList = transactionFormat(
                        transactionList,
                        address,
                        this.currentXEM1,
                        this.xemDivisibility,
                        this.node,
                        this.currentXem,
                    )
                await this.$store.commit('SET_TRANSACTION_LIST', txList)
                this.$store.commit('SET_TRANSACTIONS_LOADING', false)
                } catch (error) {
                    console.error(error)
                }
            })
        }

        // @TODO: integrate getBlockInfoByTransactionList
        /**
         * Add namespaces and divisibility to transactions and balances
         */
        augmentMosaics() {
            return new Promise(async (resolve, reject) => {
                try {
                    const appMosaics = AppMosaics()
                    appMosaics.init(this.mosaic)
                    appMosaics.fromNamespaces(this.namespaceList, this.$store)
                    appMosaics.fromTransactions(this.transactionList.transferTransactionList, this.$store)
                    // @TODO: Check if the unnamed mosaics have aliases
                    await appMosaics.augmentTransactionsMosaics(
                        this.transactionList,
                        this.$store,
                    )
                    resolve(true)
                } catch (error) {
                    reject(error)
                }
            })
        }

        async onWalletChange(newWallet) {
            try {
                await Promise.all([
                    this.$store.commit('SET_TRANSACTIONS_LOADING', true),
                    this.$store.commit('SET_BALANCE_LOADING', true),
                    this.$store.commit('SET_MOSAICS_LOADING', true),
                ])
    
                const res = await Promise.all([
                    // @TODO make it an AppWallet methods
                    this.initMosaic(newWallet),
                    getNamespaces(newWallet.address, this.node),
                    this.setTransactionList(newWallet.address)
                ])
                this.$store.commit('SET_NAMESPACE', res[1] || [])
                await this.augmentMosaics()
                 new AppWallet(newWallet).setMultisigStatus(this.node, this.$store)

                if (!this.chainListeners) {
                    this.chainListeners = new ChainListeners(this, newWallet.address, this.node)
                    this.chainListeners.start()
                    this.chainListeners.startTransactionListeners()
                } else {
                    this.chainListeners.switchAddress(newWallet.address)
                }
            } catch (error) {
                console.error(error, 'ERROR')
            }
        }

        async mounted() {
            /**
             * On app initialisation
             */
            await Promise.all([
                this.$store.commit('SET_TRANSACTIONS_LOADING', true),
                this.$store.commit('SET_BALANCE_LOADING', true),
                this.$store.commit('SET_MOSAICS_LOADING', true),
            ])
            this.$Notice.config({ duration: 4 })
            this.getMarketOpenPrice()
            const {node} = this  
            await getNetworkGenerationHash(node, this)
            await getCurrentNetworkMosaic(node, this)
            await this.setWalletsList()
            console.log(this.wallet, this.wallet.address, 'this.wallet && this.wallet.address')
            if (this.wallet && this.wallet.address) this.onWalletChange(this.wallet)

            /**
             * START EVENTS LISTENERS
             */
            this.$watchAsObservable('wallet')
                .pipe(
                    throttleTime(6000,asyncScheduler, {leading: true, trailing: true}),
                ).subscribe(({newValue, oldValue}) => {
                    /**
                     * On first wallet set
                     */
                    if(oldValue.address === undefined || newValue.address !== undefined) {
                        // @TODO
                    }
                    
                    /**
                     * On Wallet Change
                     */
                    if (oldValue.address !== undefined && newValue.address !== oldValue.address) {
                        console.log(newValue.address, oldValue.address, 'newValue.address, oldValue.addressnewValue.address, oldValue.addressnewValue.address, oldValue.address')
                        const appMosaics = AppMosaics()
                        appMosaics.reset(this.$store)
                        const networkMosaic = {hex: this.currentXEM1, name: this.currentXem}
                        appMosaics.addNetworkMosaic(networkMosaic, this.$store)
                        this.onWalletChange(newValue)
                    }
                })


            this.$store.subscribe(async (mutation, state) => {
              switch(mutation.type) {
                    /**
                     * On Node Change
                     */
                    case 'SET_NODE':
                        const node = mutation.payload
                        if (!this.chainListeners) {
                            try {
                                await getNetworkGenerationHash(node, this)
                                // @TODO: Handle generationHash change
                                await getCurrentNetworkMosaic(node, this)
                                this.chainListeners = new ChainListeners(this, this.wallet.address, node)
                                this.chainListeners.start()
                            } catch (error) {
                                console.error(error)   
                            }

                        } else {
                            this.chainListeners.switchEndpoint(node)
                        }
                    break;
              }
            })
            // @TODO: hook to onLogin event
        }

    created() {
            if (isWindows) {
                checkInstall()
            }
        }
    }


    // }

    // async getUnConfirmedTransactions() {
    //     const that = this
    //     let {accountPublicKey, currentXEM1, accountAddress, node, transactionType} = this
    //     const publicAccount = PublicAccount.createFromPublicKey(accountPublicKey, this.getWallet.networkType)
    //     await new TransactionApiRxjs().unconfirmedTransactions(
    //         publicAccount,
    //         {
    //             pageSize: 100
    //         },
    //         node,
    //     ).subscribe(async (transactionsInfo) => {
    //         let transferTransactionList = formatTransactions(transactionsInfo, accountAddress, currentXEM1)
    //         // get transaction by choose recript tx or send
    //         if (transactionType == TransferType.RECEIVED) {
    //             transferTransactionList.forEach((item) => {
    //                 if (item.isReceipt) {
    //                     that.localUnConfirmedTransactions.push(item)
    //                 }
    //             })
    //             that.getRelativeMosaicByTransaction(that.localConfirmedTransactions, node)
    //             that.onCurrentMonthChange()
    //             that.isLoadingTransactionRecord = false
    //             return
    //         }
    //         transferTransactionList.forEach((item) => {
    //             if (!item.isReceipt) {
    //                 that.localUnConfirmedTransactions.push(item)
    //             }
    //         })
    //         that.onCurrentMonthChange()
    //         that.isLoadingTransactionRecord = false
    //     })
    // }
</script>

<style lang="less">
  @import "./common/css/common.less";
  @import "./common/css/ivewWindows.less";
  @import "./common/css/iviewMac.less";
</style>
