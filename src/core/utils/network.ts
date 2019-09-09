import {NamespaceHttp, NamespaceId} from "nem2-sdk"
import {BlockApiRxjs} from '@/core/api/BlockApiRxjs.ts'
import {Message} from "@/config/index.ts"


export const getNetworkGenerationHash = async (node: string, that: any): Promise<void> => {
  try {
    const block = await new BlockApiRxjs().getBlockByHeight(node, 1).toPromise()
    that.$store.commit('SET_IS_NODE_HEALTHY', true)
    that.$Notice.success({
        title: that.$t(Message.NODE_CONNECTION_SUCCEEDED) + ''
    })
    that.$store.commit('SET_GENERATION_HASH', block.generationHash)
  } catch (error) {
    console.error(error)
    that.$Notice.error({
        title: that.$t(Message.NODE_CONNECTION_ERROR) + ''
    })
    that.$store.commit('SET_IS_NODE_HEALTHY', false)
  }
}

export const getNetworkMosaics = async (node: string, that: any): Promise<void> => {
  // @TODO: nem.xem should be an app constant
  const mainMosaicName = 'nem.xem'
  try {
    const mosaic = await new NamespaceHttp(node)
      .getLinkedMosaicId(new NamespaceId(mainMosaicName))
      .toPromise()
    
      that.$store.commit('SET_CURRENT_XEM_1', mosaic.toHex())
  } catch (error) {
    console.error(error)
    that.$store.commit('SET_IS_NODE_HEALTHY', false)
  }
}