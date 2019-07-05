import {
  Address, AliasActionType, Deadline, MosaicId, NamespaceId, NamespaceType,
  NetworkType, UInt64, Password, SimpleWallet, PublicAccount, Account, AccountInfo,
  Transaction, SignedTransaction, MultisigAccountInfo, MultisigAccountGraphInfo
} from 'nem2-sdk'

declare namespace SdkV0 {

    type Rst<TType> = Promise<{
        error?: {
            code?: number;
            message: string;
        };
        result?: TType;
    }>;
    interface wallet{
      loginWallet:(params:{
        name:string,
        privateKey:string,
        networkType:NetworkType,
        node?: string
      })=>Rst<{
        wallet: SimpleWallet,
        password: Password,
        publicAccount: PublicAccount,
        account: Account,
        mosaics: any
      }>;
      createWallet:(params:{
        name:string,
        networkType:NetworkType
      })=>Rst<{
        wallet: SimpleWallet,
        privateKey: string,
        password: Password
      }>;
      getKeys:(params:{
        password:Password,
        wallet:SimpleWallet
      })=>Rst<{
        account: Account
      }>;
    }
    interface account{
      getAccountInfo:(params:{
        address:string,
        node:string
      })=>Rst<{
        accountInfo:any
      }>;

      sign:(params:{
        wallet:SimpleWallet,
        transaction:Transaction,
        generationHash:any,
        password:Password
      })=>Rst<{
        signature:SignedTransaction
      }>;

      getMultisigAccountInfo:(params:{
        address:string,
        node:string
      })=>Rst<{
        multisigAccountInfo:MultisigAccountInfo
      }>;

      getMultisigAccountGraphInfo:(params:{
        address:string,
        node:string
      })=>Rst<{
        multisigAccountGraphInfo:any
      }>;

      encryptMessage:(params:{
        message:string,
        recipientPublicAccount:any,
        privateKey:string
      })=>Rst<{
        encryptMessage:any
      }>;

      decryptMessage:(params:{
        encryptMessage:any,
        senderPublicAccount:any,
        privateKey:string
      })=>Rst<{
        decryptMessage:any
      }>;
    }
    interface blockchain {
      getBlockByHeight:(params:{
        node:string,
        height:number
      })=>Rst<{
        Block:any
      }>

      getBlocksByHeightWithLimit:(params:{
        node:string,
        height:number,
        limit:number
      })=>Rst<{
        Blocks:any
      }>

      getBlockTransactions:(params:{
        node:string,
        height:number,
        queryParams:any
      })=>Rst<{
        blockTransactions:any
      }>

      getBlockchainHeight:(params:{
        node:string,
      })=>Rst<{
        blockchainHeight:any
      }>
    }
    interface transaction{
      announce:(params:{
        signature:any,
        node:string
      })=>Rst<{
        announceStatus:any
      }>;
      transferTransaction:(params:{
        network:number,
        MaxFee:number,
        receive:any,
        mosaics:any,
        MessageType:number,
        message:string,
      })=>Rst<{
        transferTransaction:any
      }>;
      aggregateCompleteTransaction:(params:{
        network:number,
        MaxFee:number,
        transactions:any,
      })=>Rst<{
        aggregateCompleteTransaction:object
      }>;
      aggregateBondedTransaction:(params:{
        network:number,
        transactions:any,
      })=>Rst<{
        aggregateBondedTransaction:object
      }>;
      getTransaction:(params:{
        transactionId:string,
        node:string
      })=>Rst<{
        transactionInfoThen:any
      }>;
      getTransactionStatus:(params:{
        hash:string,
        node:string
      })=>Rst<{
        transactionStatus:any
      }>;
      transactions:(params:{
        publicAccount:PublicAccount,
        queryParams:any,
        node:string
      })=>Rst<{
        transactions:any
      }>;
      incomingTransactions:(params:{
        publicAccount:PublicAccount,
        queryParams:any,
        node:string
      })=>Rst<{
        incomingTransactions:any
      }>;
      outgoingTransactions:(params:{
        publicAccount:PublicAccount,
        queryParams:any,
        node:string
      })=>Rst<{
        outgoingTransactions:any
      }>;
      unconfirmedTransactions:(params:{
        publicAccount:PublicAccount,
        queryParams:any,
        node:string
      })=>Rst<{
        unconfirmedTransactions:any
      }>;
      getAggregateBondedTransactions:(params:{
        publicAccount:any,
        queryParams:any,
        node:string
      })=>Rst<{
        aggregateBondedTransactions:any
      }>;
      announceAggregateBonded:(params:{
        signedTransaction: any,
        node: string
      })=>Rst<{
        aggregateBondedTx:any
      }>;
    }
    interface mosaic {
      createMosaicNonce:(params:{
        nonce?:Uint8Array
      })=>Rst<{
        mosaicNonce:object
      }>;

      createMosaicId:(params:{
        publicAccount:PublicAccount,
        mosaicNonce:any
      })=>Rst<{
        mosaicId:object
      }>;
      createMosaic:(params:{
        mosaicNonce:any,
        mosaicId:any,
        supplyMutable:boolean,
        transferable:boolean,
        divisibility:number,
        duration:number,
        netWorkType:number,
        maxFee?:number
      })=>Rst<{
        mosaicDefinitionTransaction:object
      }>;
      mosaicSupplyChange:(params:{
        mosaicId:any,
        delta:number,
        MosaicSupplyType:number,
        netWorkType:number,
        maxFee?:number
      })=>Rst<{
        mosaicSupplyChangeTransaction:object
      }>;
      getMosaics:(params:{
        node:string,
        mosaics:any[],
      })=>Rst<{
        mosaicsInfos:object
      }>;
      getMosaicsNames:(params:{
        node:string,
        mosaicIds:any[],
      })=>Rst<{
      mosaicsNamesInfos:object
    }>
    }
    interface alias {
      createNamespaceId:(params:{
        name: string | number[]
      })=>Rst<{
        namespaceId:NamespaceId
      }>;
      createdRootNamespace:(params:{
        namespaceName:string,
        duration:number,
        networkType:NetworkType,
        maxFee?:number
      })=>Rst<{
        rootNamespaceTransaction:{
          networkType:NetworkType,
          version:number,
          deadline:Deadline,
          maxFee:UInt64,
          namespaceType:NamespaceType,
          namespaceName:string,
          namespaceId:NamespaceId,
          duration:UInt64 | undefined
        }
      }>;
      createdSubNamespace:(params:{
        namespaceName:string,
        parentNamespace:string | NamespaceId,
        networkType:NetworkType,
        maxFee?:number
      })=>Rst<{
        subNamespaceTransaction:{
          networkType:NetworkType,
          version:number,
          deadline:Deadline,
          maxFee:UInt64,
          namespaceType:NamespaceType,
          namespaceName:string,
          namespaceId:NamespaceId
        }
      }>;
      mosaicAliasTransaction:(params:{
        actionType:AliasActionType,
        namespaceId:NamespaceId,
        mosaicId:MosaicId,
        networkType:NetworkType,
        maxFee?:number
      })=>Rst<{
        aliasMosaicTransaction:{
          networkType:NetworkType,
          version:number,
          deadline:Deadline,
          maxFee:UInt64,
          actionType:AliasActionType,
          namespaceId:NamespaceId,
          mosaicId:MosaicId
        }
      }>;
      addressAliasTransaction:(params:{
        actionType:AliasActionType,
        namespaceId:NamespaceId,
        address:Address,
        networkType:NetworkType,
        maxFee?:number
      })=>Rst<{
        aliasAddressTransaction:{
          networkType:NetworkType,
          version:number,
          deadline:Deadline,
          maxFee:UInt64,
          actionType:AliasActionType,
          namespaceId:NamespaceId,
          address:Address
        }
      }>;

      getLinkedMosaicId:(params:{
        namespaceId:NamespaceId,
        url: string
      })=>Rst<{
        mosaicId: MosaicId
      }>;

      getNamespacesFromAccount:(params:{
        address:Address,
        url: string
      })=>Rst<{
        namespaceList: any
      }>;

    }
    interface ws{
      openWs:(params:{
        listener:any
      })=>Rst<{
        ws:any
      }>;
      sendMultisigWs:(params:{
        address: Address ,
        account:any,
        node: string,
        signedBondedTx:any,
        signedLockTx:any,
        listener:any
      })=>Rst<{
        ws: any
      }>;
    }
    interface multisig {
    }
    //   wsIsOpen:(params:{
    //     webSocket:any
    //   })=>Rst<{
    //     wsIsOpen:boolean
    //   }>
    //   wsClose:(params:{
    //     webSocket:any
    //   })=>Rst<{
    //     wsClose:boolean
    //   }>
    //   wsUnconfirmedRemoved:(params:{
    //     webSocket:any,
    //     address:Address
    //   })=>Rst<{
    //     Observable:any
    //   }>
    // }
}

