import {filter, mergeMap} from 'rxjs/operators'
import {Address, Listener, TransactionHttp} from 'nem2-sdk'
import {from as observableFrom} from "rxjs"

export class ListenerApiRxjs {

    public openWs(listener: any) {
        return observableFrom(listener.open())
    }


    listenerUnconfirmed(listener: any, address: Address, fn: any) {
        return observableFrom(listener.open().then(() => {
            listener
                .unconfirmedAdded(address)
                .pipe(
                    filter((transaction: any) => transaction.transactionInfo !== undefined)
                )
                .subscribe(transactionInfo => {
                    fn(transactionInfo)
                })
        }))
    }

    listenerConfirmed(listener: any, address: Address, fn: any) {
        return observableFrom(listener.open().then(() => {
            listener.confirmed(address)
                .pipe(filter((transaction: any) => transaction.transactionInfo !== undefined))
                .subscribe(transactionInfo => {
                    fn(transactionInfo)
                })
        }))
    }

    listenerTxStatus(listener: any, address: Address, fn: any) {

        return observableFrom(listener.open().then(() => {
            listener
                .status(address)
                .subscribe(transactionInfo => {
                    fn(transactionInfo)
                })
        }))
    }

    sendMultisigWs(address: Address, account: any, node: string, signedBondedTx: any, signedLockTx: any, listener: any) {
        const transactionHttp = new TransactionHttp(node)
        return observableFrom(listener.open().then(() => {
            transactionHttp.announce(signedBondedTx)
            listener
                .confirmed(account.address)
                .pipe(
                    filter((transaction: any) => transaction.transactionInfo !== undefined
                        && transaction.transactionInfo.hash === signedLockTx.hash),
                    mergeMap(ignored => transactionHttp.announceAggregateBonded(signedBondedTx))
                )
                .subscribe()
        }))
    }


    newBlock(listener: Listener, callback) {
        return observableFrom(listener.open().then(() => {
                listener
                    .newBlock()
                    .subscribe(
                        (block) => {
                            const chainStatus = {
                                numTransactions: block.numTransactions ? block.numTransactions : 0,
                                signerPublicKey: block.signer.publicKey,
                                currentHeight: block.height.compact(),
                                currentBlockInfo: block,
                            }
                            callback(chainStatus)
                        },
                    )
            })
        )
    }
}
