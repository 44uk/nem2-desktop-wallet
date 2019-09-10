import { MosaicAlias, MosaicId } from 'nem2-sdk'

class AppMosaic {
 amount: any
 constructor(appMosaic?: {
  hex: string,
  divisibility?: number | false,
  name: string | false,
  balance: number | false,
  amount: any,
}) {
  Object.assign(this, appMosaic)
  delete this.amount
 }
 get() {
  return this
 }
}

export const AppMosaics = () => {
 const mosaics = {}
  return {
   addItem(mosaic) {
    if (!mosaic.hex) return
    if (!mosaics[mosaic.hex]) mosaics[mosaic.hex] = {}
    return Object.assign(mosaics[mosaic.hex], new AppMosaic(mosaic).get())
   },

   addItems(mosaics) {
    mosaics.forEach(this.addItem)
   },

   getItems() {
    return mosaics
   },

   getItemsWithoutAlias() {
     console.log(Object.values(mosaics), 'OBJECT VALUES MOSAICS')
     return Object.values(mosaics).filter(({name}) => !name).map(({hex}) => hex)
   },

   fromTransactions(transactions: any) {
     const mosaics = transactions.map(({mosaics}) => mosaics)
     const hexIds = [].concat(...mosaics).map(({id}) => ({hex: id.toHex()}))
     this.addItems(hexIds)
   },

   fromNamespaces(namespaces: any) {
     this.addItems(namespaces
       .filter(({alias}) => alias instanceof MosaicAlias)
       .map(namespace => ({
         hex: new MosaicId(namespace.alias.mosaicId).toHex(),
         name: namespace.name,
       })))
   },

   storeItems(store: any) {
    store.commit('SET_MOSAIC', mosaics)
   },

   augmentBalances(balances) {

   },
  }
}