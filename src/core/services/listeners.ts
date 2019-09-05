import {Address, Listener} from "nem2-sdk";
import {ListenerApiRxjs} from "@/core/api/ListenerApiRxjs.ts"

export class Listeners {
  constructor(address: string, node: string, app: any) {
    this.address = address
    this.node = node
    this.app = app
  }
  address: string
  node: string
  app: any
  confirmedTxList: any = []
  unconfirmedTxList: any = []
  errorTxList: any = []
  unconfirmedTxListener: any
  confirmedTxListener: any
  txStatusListener: any

  start() {
    this.unconfirmedListener()
    this.confirmedListener()
    this.txErrorListener()
  }

  disposeConfirmed(transaction): void {
      let list = this.confirmedTxList
      let unList = this.unconfirmedTxList
      if (!list.includes(transaction.transactionInfo.hash)) {
          list.push(transaction.transactionInfo.hash)
          if (unList.includes(transaction.transactionInfo.hash)) {
              unList.splice(unList.indexOf(transaction.transactionInfo.hash), 1)
          }
          this.confirmedTxList = list
          this.unconfirmedTxList = unList
          this.app.$Notice.destroy()
          this.app.$Notice.success({
              title: this.app.$t('Transaction_Reception').toString(),
              duration: 4,
          })
      }
  }

  disposeTxStatus(transaction): void {
      let list = this.errorTxList
      if (!list.includes(transaction.hash)) {
          list.push(transaction.hash)
          this.app.$store.commit('SET_ERROR_TEXT', list)
          this.app.$Notice.destroy()
          this.app.$Notice.error({
              title: transaction.status.split('_').join(' '),
              duration: 10,
          })
      }
  }

  disposeUnconfirmed(transaction): void {
      let list = this.unconfirmedTxList
      if (!list.includes(transaction.transactionInfo.hash)) {
          list.push(transaction.transactionInfo.hash)
          this.unconfirmedTxList = list
          this.app.$Notice.success({
              title: this.app.$t('Transaction_sending').toString(),
              duration: 20,
          })
      }
  }

  unconfirmedListener(): void {
      const node = this.node.replace('http', 'ws')
      this.unconfirmedTxListener && this.unconfirmedTxListener.close()
      this.unconfirmedTxListener = new Listener(node, WebSocket)
      new ListenerApiRxjs().listenerUnconfirmed(this.unconfirmedTxListener, Address.createFromRawAddress(this.address), this.disposeUnconfirmed)
  }

  confirmedListener(): void {
      const node = this.node.replace('http', 'ws')
      this.confirmedTxListener && this.confirmedTxListener.close()
      this.confirmedTxListener = new Listener(node, WebSocket)
      new ListenerApiRxjs().listenerConfirmed(this.confirmedTxListener,
        Address.createFromRawAddress(this.address), this.disposeConfirmed)
  }

  txErrorListener(): void {
      const node = this.node.replace('http', 'ws')
      this.txStatusListener && this.txStatusListener.close()
      this.txStatusListener = new Listener(node, WebSocket)
      new ListenerApiRxjs().listenerTxStatus(this.txStatusListener, Address.createFromRawAddress(this.address), this.disposeTxStatus)
  }

  chainListner() {
    if (!this.node) {
        return
    }
    const node = this.node.replace('http', 'ws')
    const listener = new Listener(node, WebSocket)
    new ListenerApiRxjs().newBlock(listener, this.setChainStatus)
  }

  setChainStatus(chainStatus) {
    this.app.$store.commit('SET_CHAIN_STATUS', chainStatus)
  }
}