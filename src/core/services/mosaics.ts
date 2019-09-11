import {AccountHttp, Address, MosaicAmountView, Mosaic, MosaicService, MosaicHttp, MosaicId} from 'nem2-sdk'

/**
 * Custom implementation for performance gains
 * @TODO: replace by SDK method when updated
 * https://github.com/nemtech/nem2-sdk-typescript-javascript/issues/247
 */
export const mosaicsAmountViewFromAddress = (node: string, address: Address): Promise<MosaicAmountView[]> => {
  return new Promise(async (resolve, reject) => {
    try {
      const accountHttp = new AccountHttp(node)
      const mosaicHttp = new MosaicHttp(node)
      const mosaicService = new MosaicService(accountHttp, mosaicHttp)

      const accountInfo = await accountHttp.getAccountInfo(address).toPromise()
      if(!accountInfo.mosaics.length) return []
    
      const mosaics = accountInfo.mosaics.map(mosaic => mosaic)
      const mosaicIds = mosaics.map(({id}) => new MosaicId(id.toHex()))
      const mosaicViews = await mosaicService.mosaicsView(mosaicIds).toPromise()

      const mosaicAmountViews = mosaics
        .map(mosaic => {
          const mosaicView = mosaicViews
           .find(({mosaicInfo}) => mosaicInfo.mosaicId.toHex() === mosaic.id.toHex())
           
          if(mosaicView === undefined) throw new Error('A MosaicView was not found')
          return new MosaicAmountView(mosaicView.mosaicInfo, mosaic.amount)
        })
         
      resolve(mosaicAmountViews)
    } catch (error) {
      reject(error)
    }
  })
}

