import {Address, Listener} from "nem2-sdk";
import {filter} from 'rxjs/operators'

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
        console.log(`starting listeners for ${this.address} on ${this.node}`)
        this.unconfirmedListener()
        this.confirmedListener()
        this.txErrorListener()
        this.chainListener()
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
        const notice = this.app.$Notice
        this.unconfirmedTxListener = new Listener(this.node, WebSocket)
        this.unconfirmedTxListener
            .open()
            .then(() => {
                this.unconfirmedTxListener
                    .confirmed(Address.createFromRawAddress(this.address))
                    .pipe(filter((transaction: any) => transaction.transactionInfo !== undefined))
                    .subscribe(transaction => {
                        if (!unconfirmedTxList.includes(transaction.transactionInfo.hash)) {
                            unconfirmedTxList.push(transaction.transactionInfo.hash)
                            notice.success({
                                title: this.app.$t('Transaction_sending').toString(),
                                duration: 20,
                            })
                        }
                    })
            })

    }

    
    confirmedListener(): void {
        this.confirmedTxListener && this.confirmedTxListener.close()
        const {confirmedTxList, unconfirmedTxList} = this
        const notice = this.app.$Notice
        this.confirmedTxListener = new Listener(this.node, WebSocket)
        this.confirmedTxListener
            .open()
            .then(() => {
                this.confirmedTxListener
                    .confirmed(Address.createFromRawAddress(this.address))
                    .pipe(filter((transaction: any) => transaction.transactionInfo !== undefined))
                    .subscribe(transaction => {
                        if (!confirmedTxList.includes(transaction.transactionInfo.hash)) {
                            confirmedTxList.push(transaction.transactionInfo.hash)
                            if (unconfirmedTxList.includes(transaction.transactionInfo.hash)) {
                                unconfirmedTxList.splice(confirmedTxList.indexOf(transaction.transactionInfo.hash), 1)
                            }
                            notice.destroy()
                            notice.success({
                                title: this.app.$t('Transaction_Reception').toString(),
                                duration: 4,
                            })
                        }
                    })
            })

    }

    txErrorListener(): void {
        this.txStatusListener && this.txStatusListener.close()
        const {errorTxList} = this
        const store = this.app.$store
        const notice = this.app.$Notice
        this.txStatusListener = new Listener(this.node, WebSocket)
        this.txStatusListener
            .open()
            .then(() => {
                this.txStatusListener
                    .status(Address.createFromRawAddress(this.address))
                    .subscribe(transaction => {
                        if (!errorTxList.includes(transaction.hash)) {
                            errorTxList.push(transaction.hash)
                            store.commit('SET_ERROR_TEXT', errorTxList)
                            notice.destroy()
                            notice.error({
                                title: transaction.status.split('_').join(' '),
                                duration: 10,
                            })
                        }
                    })
            })

    }

    chainListener() {
        console.log('chainListener called', this, this.newBlocksListener)
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