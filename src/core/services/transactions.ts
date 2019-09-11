import {PublicAccount, NetworkType} from "nem2-sdk"
import {TransactionApiRxjs} from '@/core/api/TransactionApiRxjs.ts'
import {transactionFormat} from '@/core/utils/format.ts'

export const setTransactionList = (address, that) => {
 const context = that
 that.$store.commit('SET_TRANSACTIONS_LOADING', true)
 let {accountPublicKey, node} = that
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
             context.currentXEM1,
             context.xemDivisibility,
             context.node,
             context.currentXem,
         )
     await that.$store.commit('SET_TRANSACTION_LIST', txList)
     that.$store.commit('SET_TRANSACTIONS_LOADING', false)
     } catch (error) {
         console.error(error)
     }
 })
}

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