import {Address, Listener} from "nem2-sdk";
import {filter} from 'rxjs/operators'
import {transactionFormat} from '@/core/utils/format.ts'
import {formatAndSave} from '@/core/services/transactions'

export class ChainListeners {
    private readonly app: any
    private node: string
    // @TODO address as Address
    private address: string

    constructor(app: any, address: string, endpoint: string) {
        this.app = app
        this.address = address
        this.node = endpoint.replace('http', 'ws')
    }

    confirmedTxList: any = []
    unconfirmedTxList: any = []
    errorTxList: any = []
    unconfirmedTxListener: Listener
    confirmedTxListener: Listener
    txStatusListener: Listener
    newBlocksListener: Listener

    start() {
        console.log(`starting chain listener for ${this.address} on ${this.node}`)
        this.chainListener()
    }

    startTransactionListeners() {
        console.log(`starting transactions listeners for ${this.address} on ${this.node}`)
        this.unconfirmedListener()
        this.confirmedListener()
        this.txErrorListener()
    }

    switchAddress(address: string) {
        this.address = address
        console.log(`ChainListeners switchAddress to ${this.address}`)
        this.unconfirmedListener()
        this.confirmedListener()
        this.txErrorListener()
    }

    switchEndpoint(endpoint: string) {
        this.node = endpoint.replace('http', 'ws')
        console.log(`ChainListeners switchEndpoint to ${this.node}`)
        this.chainListener()
    }

    unconfirmedListener(): void {
        this.unconfirmedTxListener && this.unconfirmedTxListener.close()
        const {unconfirmedTxList} = this
        const that = this.app
        this.unconfirmedTxListener = new Listener(this.node, WebSocket)
        this.unconfirmedTxListener
            .open()
            .then(() => {
                this.unconfirmedTxListener
                    .unconfirmedAdded(Address.createFromRawAddress(this.address))
                    .pipe(filter((transaction: any) => transaction.transactionInfo !== undefined))
                    .subscribe(transaction => {
                        console.log(that, '9898989898989898', that.$Notice)

                        if (!unconfirmedTxList.includes(transaction.transactionInfo.hash)) {
                            unconfirmedTxList.push(transaction.transactionInfo.hash)
                            that.$Notice.success({
                                title: that.$t('Transaction_sending').toString(),
                                duration: 20,
                            })
                        }
                    })
            })

    }

    confirmedListener(): void {
        this.confirmedTxListener && this.confirmedTxListener.close()
        const {confirmedTxList, unconfirmedTxList} = this
        const that = this.app
        this.confirmedTxListener = new Listener(this.node, WebSocket)
        this.confirmedTxListener
            .open()
            .then(() => {
                this.confirmedTxListener
                    .confirmed(Address.createFromRawAddress(this.address))
                    .pipe(filter((transaction: any) => transaction.transactionInfo !== undefined))
                    .subscribe((transaction) => {
                        if (!confirmedTxList.includes(transaction.transactionInfo.hash)) {
                            confirmedTxList.push(transaction.transactionInfo.hash)
                            if (unconfirmedTxList.includes(transaction.transactionInfo.hash)) {
                                unconfirmedTxList.splice(confirmedTxList.indexOf(transaction.transactionInfo.hash), 1)
                            }
                            console.log('that.store',that.$store )
                            // @TODO: using $store like that is a quickfix
                            formatAndSave(
                                that.$store.getters.mosaicList,
                                transaction,
                                that.$store.getters.wallet.address,
                                that.$store.getters.currentXEM1,
                                that.$store.getters.xemDivisibility,
                                that.$store.getters.node,
                                that.$store.getters.currentXem,
                                that.$store,
                            )

                            that.$Notice.destroy()
                            that.$Notice.success({
                                title: that.$t('Transaction_Reception').toString(),
                                duration: 4,
                            })
                        }
                    })
            })

    }

    txErrorListener(): void {
        this.txStatusListener && this.txStatusListener.close()
        const {errorTxList} = this
        const {$Notice, $store} = this.app
        this.txStatusListener = new Listener(this.node, WebSocket)
        this.txStatusListener
            .open()
            .then(() => {
                this.txStatusListener
                    .status(Address.createFromRawAddress(this.address))
                    .subscribe(transaction => {
                        if (!errorTxList.includes(transaction.hash)) {
                            errorTxList.push(transaction.hash)
                            $store.commit('SET_ERROR_TEXT', errorTxList)
                            $Notice.destroy()
                            $Notice.error({
                                title: transaction.status.split('_').join(' '),
                                duration: 10,
                            })
                        }
                    })
            })

    }

    chainListener() {
        const store = this.app.$store
        this.newBlocksListener && this.newBlocksListener.close()
        this.newBlocksListener = new Listener(this.node, WebSocket)
        this.newBlocksListener
            .open()
            .then(() => {
                this.newBlocksListener
                    .newBlock()
                    .subscribe(block => {
                        store.commit('SET_CHAIN_STATUS', {
                            numTransactions: block.numTransactions ? block.numTransactions : 0,
                            signerPublicKey: block.signer.publicKey,
                            currentHeight: block.height.compact(),
                            currentBlockInfo: block,
                        })
                    })
            })
    }
}