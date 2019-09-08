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
        PublicAccount, NetworkType, MosaicService, AccountHttp, UInt64, MosaicInfo
    } from "nem2-sdk"
    import {checkInstall} from '@/core/utils/electron.ts'
    import {AccountApiRxjs} from '@/core/api/AccountApiRxjs.ts'
    import {ListenerApiRxjs} from '@/core/api/ListenerApiRxjs.ts'
    import {Component, Vue} from 'vue-property-decorator'
    import {mapState} from 'vuex'
    import {BlockApiRxjs} from '@/core/api/BlockApiRxjs.ts'
    import {ChainListeners} from '@/core/services/listeners'
    import {aliasType} from '@/config/index.ts'
    import {market} from "@/core/api/logicApi.ts"
    import {KlineQuery} from "@/core/query/klineQuery.ts"
    import {TransactionApiRxjs} from '@/core/api/TransactionApiRxjs.ts'
    import {transactionFormat} from '@/core/utils/format.ts'
    import {toArray, flatMap, concatMap, map, tap} from 'rxjs/operators'

    @Component({
        computed: {
            ...mapState({activeAccount: 'account', app: 'app'})
        }
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
        // App init
        // Endpoint change
        // SET_IS_NODE_HEALTHY set to false
        async getNetworkGenerationHash(): Promise<void> {
            const {currentNode} = this
            try {
                const block = await new BlockApiRxjs().getBlockByHeight(currentNode, 1).toPromise()
                this.$store.commit('SET_IS_NODE_HEALTHY', true)
                this.$Notice.success({
                    title: this.$t(Message.NODE_CONNECTION_SUCCEEDED) + ''
                })
                this.$store.commit('SET_GENERATION_HASH', block.generationHash)
            } catch (error) {
                console.error(error)
                this.$Notice.error({
                    title: this.$t(Message.NODE_CONNECTION_ERROR) + ''
                })
                this.$store.commit('SET_IS_NODE_HEALTHY', false)
            }
        }

        // App init
        // Endpoint change
        // SET_IS_NODE_HEALTHY set to false
        async getNetworkInfo(): Promise<void> {
            const {currentNode} = this
            try {
                const block: any = await new BlockApiRxjs().getBlockchainHeight(currentNode).toPromise()
                this.$store.commit('SET_CHAIN_STATUS', {
                    numTransactions: block.numTransactions ? block.numTransactions : 0,
                    signerPublicKey: block.signer.publicKey,
                    currentHeight: block.height.compact(),
                    currentBlockInfo: block,
                    currentGenerateTime: 12
                })
            } catch (error) {
                console.error(error)
                this.$store.commit('SET_IS_NODE_HEALTHY', false)
            }
        }

        // SET_GENERATION_HASH change
        async getNetworkMosaics(): Promise<void> {
            const {currentNode} = this
            // @TODO: nem.xem should be an app constant
            const mainMosaicName = 'nem.xem'
            try {
                const mosaic = await new NamespaceHttp(currentNode)
                  .getLinkedMosaicId(new NamespaceId(mainMosaicName))
                  .toPromise()

                // @TODO: check wether !mosaic works
                if (!mosaic) {
                    throw new Error(`${mainMosaicName} was not found`)
                    this.$store.commit('SET_CURRENT_XEM_1', mosaic.toHex())
                }  
            } catch (error) {
                console.error(error)
                this.$store.commit('SET_IS_NODE_HEALTHY', false)
            }
        }

        // @TODO: move out from there
        async setWalletsBalancesAndMultisigStatus() {
            this.$store.commit('SET_BALANCE_LOADING', true)
            const walletListFromStorage: any = localRead('wallets') !== '' ? JSON.parse(localRead('wallets')) : false
            if (!walletListFromStorage || !walletListFromStorage.length) return
            AppWallet.switchWallet(walletListFromStorage[0].address, walletListFromStorage, this.$store)
            const networkCurrencies = [this.currentXEM1, this.currentXEM2]
            // @TODO: use get accountsInfo instead
            try {
                const balances = await Promise.all(
                    [...walletListFromStorage]
                      .map(wallet => new AppWallet(wallet)
                      .getAccountBalance(networkCurrencies, this.node))
                  )
                const walletListWithBalances = [...walletListFromStorage].map((wallet, i) => ({...wallet, balance: balances[i]}))
                const activeWalletWithBalance = walletListWithBalances.find(wallet => wallet.address === this.wallet.address)
                if (activeWalletWithBalance === undefined) throw new Error('an active wallet was not found in the wallet list')
                await Promise.all([
                    this.$store.commit('SET_WALLET_LIST', walletListWithBalances),
                    this.$store.commit('SET_WALLET', activeWalletWithBalance),
                ])
                this.$store.commit('SET_BALANCE_LOADING', false)
                localSave('wallets', JSON.stringify(walletListWithBalances))

                const multisigStatuses = await Promise.all(
                    [...walletListFromStorage]
                      .map(wallet => new AppWallet(wallet)
                      .setMultisigStatus(this.node))
                  )

                const walletListWithMultisigStatuses = [...walletListWithBalances]
                    .map((wallet, i) => ({...wallet, isMultisig: multisigStatuses[i]}))

                const activeWalletWithMultisigStatus = walletListWithMultisigStatuses
                  .find(wallet => wallet.address === this.wallet.address)
                if (activeWalletWithMultisigStatus === undefined) throw new Error('an active wallet was not found in the wallet list')
                this.$store.commit('SET_WALLET_LIST', walletListWithMultisigStatuses)
                this.$store.commit('SET_WALLET', activeWalletWithMultisigStatus)
                localSave('wallets', JSON.stringify(walletListWithMultisigStatuses))
            } catch (error) {
              // Use this error for network status
              throw new Error(error)
            }
        }
    


            // let addressMap = {}

            
            // const defaultMosaic = {
            //     amount: 0,
            //     name: nodeConfig.currentXem,
            //     hex: that.currentXEM1,
            //     show: true,
            //     divisibility: 6,
            //     showInManage: true
            // }



        // @TODO: move out from there
        async initMosaic(wallet) {
            const address = Address.createFromRawAddress(wallet.address)
            await Promise.all([
                this.$store.commit('SET_MOSAIC_LOADING', true),
                this.$store.commit('SET_BALANCE_LOADING', true),
            ])

            let {accountAddress, node, currentXem} = this
            const mosaicList: any = await getMosaicList(accountAddress, node)
            const mosaicHexIds = mosaicList.map(item => item.id.toHex())
            const mosaicInfoList = await getMosaicInfoList(node, mosaicList)

            // @TODO: move out from there and set @generationHash change
            const networkMosaic = await new NamespaceHttp(node)
                .getLinkedMosaicId(new NamespaceId(nodeConfig.currentXem)).toPromise()

            const networkMosaicId = networkMosaic.toHex()
            this.$store.commit('SET_CURRENT_XEM_1', networkMosaicId)
                
            const networkMosaicInfo = await new MosaicHttp(node)
                .getMosaic(networkMosaic).toPromise()

            // @TODO: probably not useful
            this.$store.commit('SET_XEM_DIVISIBILITY', networkMosaicInfo.divisibility)
            const getName = (hexId: string): string|false => hexId === networkMosaicId ? currentXem : false

            const mosaicService = new MosaicService(new AccountHttp(node), new MosaicHttp(node));
            const mosaics = await mosaicService.mosaicsAmountViewFromAddress(address)
                .pipe(
                    flatMap(x => x),
                    toArray(),
                    map(x => {
                        const networkMosaicIndex = x.findIndex(({mosaicInfo}) => mosaicInfo.mosaicId.toHex() === networkMosaicId)
                        
                        if (networkMosaicIndex > -1) {
                            if (networkMosaicIndex === 0) return x
                            const newList = [...x]
                            newList.splice(networkMosaicIndex, 1)
                            return [x[networkMosaicIndex], ...newList]
                        }
                        return [{amount: UInt64.fromUint(0), mosaicInfo: networkMosaicInfo}, ...x]
                    }),
                    flatMap(x => x),
                    map(x => {
                        const hex = x.mosaicInfo.mosaicId.toHex()
                        // @TODO: Why duplicate divisibility
                        const divisibility = x.mosaicInfo.divisibility
                        const amount = getRelativeMosaicAmount(x.amount.compact(), divisibility)

                        if (hex === networkMosaicId) new AppWallet(wallet)
                            .updateAccountBalance(amount, this.$store)

                        // @TODO make this object an interface
                        return {
                            ...x,
                            hex,
                            name: getName(hex),
                            amount,
                            divisibility,
                            show: true,
                            showInManage: true,
                        }
                    }),
                    toArray()
                ).toPromise()

            this.$store.commit('SET_MOSAICS', mosaics)
            this.$store.commit('SET_MOSAIC_LOADING', false)
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
        setTransferTransactionList(address) {
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
                    )
                await this.$store.commit('SET_TRANSACTION_LIST', txList)
                this.$store.commit('SET_TRANSACTIONS_LOADING', false)
                } catch (error) {
                    console.error(error)
                }
            })
        }

        // @TODO: integrate
        // try {
        //     await that.getBlockInfoByTransactionList(that.allTransactionsList, node)
        // } catch (e) {
        //     console.log(e)
        // }

        mounted() {
            this.setWalletsBalancesAndMultisigStatus()
            this.getMarketOpenPrice()
            if (this.wallet && this.wallet.address) {
                if (!this.chainListeners) {
                    this.chainListeners = new ChainListeners(this, this.wallet.address, this.node)
                    this.chainListeners.start()
                } else {
                    this.chainListeners.switchAddress(this.wallet.address)
                }
                this.initMosaic(this.wallet)
                this.setTransferTransactionList(this.wallet.address)
            }

            this.$Notice.config({ duration: 4 })

            this.$store.watch(
                (state, getters) => getters.wallet,
                async (newWallet, oldWallet) => {
                    /**
                     * On No Wallet Set
                     */
                    if(!newWallet || !newWallet.address) {
                        // @TODO: no wallet available
                    }
                    
                    /**
                     * On Wallet Change
                     */
                    if (newWallet.address !== oldWallet.address) {
                        console.log('on wallet change,', )
                        if (!this.chainListeners) {
                            this.chainListeners = new ChainListeners(this, newWallet.address, this.node)
                            this.chainListeners.start()
                        } else {
                            this.chainListeners.switchAddress(newWallet.address)
                        }
                        try {
                            await this.$store.commit('SET_TRANSACTIONS_LOADING', true)

                            const res = await Promise.all([
                                // @TODO mape AppWallet methods
                                this.initMosaic(newWallet),
                                getNamespaces(newWallet.address, this.node),
                                this.setTransferTransactionList(newWallet.address)
                            ])
                            this.$store.commit('SET_NAMESPACE', res[1] || [])
                            
                        } catch (error) {
                            console.error(error, 'ERROR')
                        }

                    }
            }, {deep: true})


            this.$store.subscribe((mutation, state) => {
              switch(mutation.type) {
                    /**
                     * On Node Change
                     */
                    case 'SET_NODE':
                        if (!this.chainListeners) {
                            this.chainListeners = new ChainListeners(this, this.wallet.address, this.node)
                            this.chainListeners.start()
                        } else {
                            this.chainListeners.switchEndpoint(this.node)
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
    // async getMyNamespaces() {
    //     if (!this.wallet.address) {
    //         this.$store.commit('SET_NAMESPACE', [])
    //         return
    //     }
    //     const list = await getNamespaces(this.wallet.address, this.node)
    //     this.$store.commit('SET_NAMESPACE', list)
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
/*
    ----------------------
    TODOs
    ----------------------
    Get account address alias (update when method available)


    ----------------------
    Confirmed Tx change
    ----------------------

    // MonitorDashboard
    this.allTransactionsList = []
    this.refreshReceiptList()
    this.refreshTransferTransactionList()

    // MosaicList
    this.initMosaic()

    // WalletPanel
    this.getMyNamespaces()

    // NamespaceTs
    this.getMyNamespaces()

    // CollectionRecord
    this.isLoadingTransactionRecord = true
    this.getConfirmedTransactions()

    // MonitorPanel
    this.initMosaic()
    this.getAccountsName()
    this.getMyNamespaces()

    ----------------------
    Unconfirmed Tx change
    ----------------------
    // Collection record
    this.isLoadingTransactionRecord = true
    this.getUnConfirmedTransactions()
*/
</script>

<style lang="less">
  @import "./common/css/common.less";
  @import "./common/css/ivewWindows.less";
  @import "./common/css/iviewMac.less";
</style>
