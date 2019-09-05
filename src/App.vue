<template>
  <div id="app" :class="[isWindows?'windows':'mac']">
    <router-view/>
  </div>
</template>

<script lang="ts">
    import 'animate.css'
    import {isWindows, Message} from "@/config/index.ts"
    import {localRead, localSave} from '@/core/utils/utils.ts'
    import {AppWallet} from '@/core/utils/wallet.ts'
    import {Listener, NamespaceHttp, NamespaceId, Address} from "nem2-sdk"
    import {checkInstall} from '@/core/utils/electron.ts'
    import {AccountApiRxjs} from '@/core/api/AccountApiRxjs.ts'
    import {ListenerApiRxjs} from '@/core/api/ListenerApiRxjs.ts'
    import {Component, Vue} from 'vue-property-decorator'
    import {mapState} from 'vuex'
    import {BlockApiRxjs} from '@/core/api/BlockApiRxjs.ts'
    import {Listeners} from '@/core/services/listeners'

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

        get node(): string {
            return this.activeAccount.node
        }

        get wallet(): any {
            return this.activeAccount.wallet
        }

        get currentXEM2(): string {
            return this.activeAccount.currentXEM2
        }

        get currentXEM1(): string {
            return this.activeAccount.currentXEM1
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

        get errorTxList() { return this.activeAccount.errorTx }
        get confirmedTxList() { return this.activeAccount.ConfirmedTx }
        set confirmedTxList(tx) { this.$store.commit('SET_CONFIRMED_TX', tx) }
        get unconfirmedTxList() { return this.activeAccount.UnconfirmedTx }
        set unconfirmedTxList(tx) { this.$store.commit('SET_UNCONFIRMED_TX', tx) }

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


        async setWalletsBalancesAndMultisigStatus() {
            const walletListFromStorage: any = localRead('wallets') !== '' ? JSON.parse(localRead('wallets')) : false
            if (!walletListFromStorage || !walletListFromStorage.length) return
            AppWallet.switchWallet(walletListFromStorage[0].address, walletListFromStorage, this.$store)
            const networkCurrencies = [this.currentXEM1, this.currentXEM2]
            try {
                const balances = await Promise.all(
                    [...walletListFromStorage]
                      .map(wallet => new AppWallet(wallet)
                      .getAccountBalance(networkCurrencies, this.node))
                  )
                const walletListWithBalances = [...walletListFromStorage].map((wallet, i) => ({...wallet, balance: balances[i]}))
                const activeWalletWithBalance = walletListWithBalances.find(wallet => wallet.address === this.wallet.address)
                if (activeWalletWithBalance === undefined) throw new Error('an active wallet was not found in the wallet list')
                this.$store.commit('SET_WALLET_LIST', walletListWithBalances)
                this.$store.commit('SET_WALLET', activeWalletWithBalance)
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



        mounted() {
            this.$Notice.config({
                duration: 4,
            })

            this.$store.subscribe((mutation, state) => {
              switch(mutation.type) {
                  /**
                   * On Wallet Change
                   */
                  case 'SET_WALLET':
                    const {wallet} = state.account;
                    console.log(`SET_WALLET to ${wallet.address}`);

                    if(!wallet.address) {
                        // No wallet available
                        return
                    }
                    break;

                  /**
                   * On Wallet Change
                   */
                  case 'SET_NODE':
                    break;
              }
            })

            this.setWalletsBalancesAndMultisigStatus()
        }

        created() {
            if (isWindows) {
                checkInstall()
            }
        }
    }
</script>

<style lang="less">
  @import "./common/css/common.less";
  @import "./common/css/ivewWindows.less";
  @import "./common/css/iviewMac.less";
</style>
