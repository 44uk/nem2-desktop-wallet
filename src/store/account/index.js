export default {
    state: {
        accountPrivateKey: '25B3F54217340F7061D02676C4B928ADB4395EB70A2A52D2A11E2F4AE011B03E',
        accountPublicKey: 'AC1A6E1D8DE5B17D2C6B1293F1CAD3829EEACF38D09311BB3C8E5A880092DE26',
        accountAddress: 'SCA7ZS-2B7DEE-BGU3TH-SILYHC-RUR32Y-YE55ZB-LYA2',
        node: 'http://47.107.245.217:3000',
        currentXem: 'nem.xem',
        currentXEM1: '37EF2403A20729DF',
        currentXEM2: '1B47399ABD2C1E49',
        account: {},
        wallet: {},
        mosaic: [],
        namespace: [],
        UnconfirmedTx: [],
        ConfirmedTx: [],
        generationHash: ''
    },
    getters: {
        Address: function (state) {
            return state.account.address;
        },
        PublicAccount: function (state) {
            return state.account.publicAccount;
        },
        privateKey: function (state) {
            return state.account.privateKey;
        },
        publicKey: function (state) {
            return state.account.publicKey;
        }
    },
    mutations: {
        SET_ACCOUNT: function (state, account) {
            state.account = account;
        },
        SET_WALLET: function (state, wallet) {
            state.wallet = wallet;
        },
        SET_MOSAICS: function (state, mosaic) {
            state.mosaic = mosaic;
        },
        SET_NAMESPACE: function (state, namespace) {
            state.namespace = namespace;
        },
    },
};
//# sourceMappingURL=index.js.map