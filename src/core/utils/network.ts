import {QueryParams, TransactionType, MosaicAlias} from "nem2-sdk"
import {BlockApiRxjs} from '@/core/api/BlockApiRxjs.ts'
import {Message} from "@/config/index.ts"
import {NamespaceApiRxjs} from '../api/NamespaceApiRxjs'
import {map} from 'rxjs/operators'
import {AppMosaics} from '@/core/utils/mosaics'

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

// get current network mosaic hex by Genesis Block Info
export const getCurrentNetworkMosaic = (node: string, that: any) => {
    return new Promise(async (resolve, reject) => {
        try {
            await new BlockApiRxjs().getBlockTransactions(node, 1, new QueryParams(100)).pipe(map(
                (genesisBlockInfoList: any) => {
                    const mosaicDefinitionTx = genesisBlockInfoList.find(({type}) => type === TransactionType.MOSAIC_DEFINITION)
                    const mosaicAliasTx = genesisBlockInfoList.find(({type}) => type === TransactionType.MOSAIC_ALIAS)
                    that.$store.commit('SET_CURRENT_XEM_1', mosaicDefinitionTx.mosaicId.toHex())
                    that.$store.commit('SET_XEM_DIVISIBILITY', mosaicDefinitionTx.mosaicProperties.divisibility)
            
                    new NamespaceApiRxjs().getNamespacesName([mosaicAliasTx.namespaceId], node).subscribe((namespaceNameResultList: any) => {
                        let namespaceMap = {}
                        let rootNamespace: any = {}
                        // get root namespace and get namespaceMap to get fullname
                        namespaceNameResultList.forEach((item) => {
                            if (!item.parentId) {
                                rootNamespace = item
                                return
                            }
                            namespaceMap[item.parentId.toHex()] = item
                        })
                        const rootHex = rootNamespace.namespaceId.toHex()
                        let currentNamespace = rootNamespace.name
                        // namespace max level <= 3
                        if (namespaceMap[rootHex]) {
                            const middleHex = namespaceMap[rootHex].namespaceId.toHex()
                            currentNamespace += '.' + namespaceMap[rootHex].name
                            if (namespaceMap[middleHex]) {
                                const leafHex = namespaceMap[middleHex].name
                                currentNamespace += '.' + leafHex
                            }
                        }
                        const appMosaics = AppMosaics()
                        appMosaics.fromGetCurrentNetworkMosaic(mosaicDefinitionTx, currentNamespace, that.$store)
                        that.$store.commit('SET_CURRENT_XEM', currentNamespace)
                    })
                })).toPromise()
                resolve(true)
        } catch (error) {
            that.$store.commit('SET_IS_NODE_HEALTHY', false)
            reject(error)
        }
    })
}