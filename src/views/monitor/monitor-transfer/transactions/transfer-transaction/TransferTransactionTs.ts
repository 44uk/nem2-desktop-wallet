import {Message, formData} from "@/config/index.ts"
import {Mosaic, MosaicId, NamespaceHttp, NamespaceId, UInt64} from 'nem2-sdk'
import {Component, Vue, Watch, Provide} from 'vue-property-decorator'
import {TransactionApiRxjs} from '@/core/api/TransactionApiRxjs.ts'
import CheckPWDialog from '@/common/vue/check-password-dialog/CheckPasswordDialog.vue'
import {cloneData, getAbsoluteMosaicAmount} from '@/core/utils/utils'
import ErrorTooltip from '@/views/other/forms/errorTooltip/ErrorTooltip.vue'
import {standardFields} from '@/core/validation'
import {mapState} from 'vuex'
import {NamespaceApiRxjs} from '@/core/api/NamespaceApiRxjs.ts'
import {MessageType} from "nem2-sdk/dist/src/model/transaction/MessageType"

@Component({
    components: {CheckPWDialog, ErrorTooltip},
        computed: {
        ...mapState({
            activeAccount: 'account',
            app: 'app',
        })
    },
})
export default class TransferTransactionTs extends Vue {
    @Provide() validator: any = this.$validator
    app: any
    activeAccount: any
    isShowSubAlias = false
    standardFields: object = standardFields
    errors: any
    submitDisabled: boolean = false
    transactionList = []
    transactionDetail = {}
    showCheckPWDialog = false
    isCompleteForm = false
    currentMosaic: string = ''
    currentAmount: number = 0
    isAddressMapNull = true
    isAddressAliasExist = false
    formFields = formData.transferForm
    formModel = cloneData(this.formFields)

    get wallet() {
        return this.activeAccount.wallet
    }

    get mosaicsLoading() {
        return this.app.mosaicsLoading
    }

    get accountAddress() {
        return this.activeAccount.wallet.address
    }

    get node() {
        return this.activeAccount.node
    }

    get currentXem() {
        return this.activeAccount.currentXem
    }

    get generationHash() {
        return this.activeAccount.generationHash
    }

    get mosaics() {
        return this.activeAccount.mosaic
    }

    get mosaicList() {
        // @TODO: would be better to return a loading indicator
        // instead of an empty array ([] = "no matching data" in the select dropdown)
        const {mosaics} = this
        if (this.mosaicsLoading || !mosaics) return []
        
        return [...mosaics].map(({name, amount, hex}) => ({
            label: `${name||hex} (${amount})`,
            value: hex,
        }))
    }

    get addresAliasMap() {
        const addresAliasMap = this.activeAccount.addresAliasMap
        for (let item in addresAliasMap) {
            this.isAddressMapNull = false
            return addresAliasMap
        }
        this.isAddressMapNull = true
        return addresAliasMap
    }

    get xemDivisibility() {
        return this.activeAccount.xemDivisibility
    }

    addMosaic() {
        const {currentMosaic, mosaics, currentAmount} = this
        const {divisibility} = mosaics.find(({hex})=> hex === currentMosaic)
        this.formModel.mosaicTransferList
            .push(
                new Mosaic(
                    new MosaicId(currentMosaic),
                    UInt64.fromUint(
                        getAbsoluteMosaicAmount(currentAmount, divisibility)
                    )
                )
            )
    }

    removeMosaic(index) {
        this.formModel.mosaicTransferList.splice(index, 1)
    }

    resetFields() {
        this.formModel = cloneData(this.formFields)
        this.$nextTick(() => this.$validator.reset())
    }

    submit() {
        this.$validator
            .validate()
            .then((valid) => {
                if (!valid) return
                this.showDialog()
            })
    }

    showDialog() {
        const {address, mosaicTransferList, remark, fee, isEncrypted} = this.formModel
        this.transactionDetail = {
            "transaction_type": 'ordinary_transfer',
            "transfer_target": address,
            "mosaic": mosaicTransferList.map(item => {
                return item.id.id.toHex() + `(${item.amount.compact()})`
            }).join(','),
            "fee": fee + 'XEM',
            "remarks": remark,
            "encryption": isEncrypted,
        }
        this.generateTransaction()
        this.showCheckPWDialog = true
    }

    async formatAddress() {
        const {node} = this
        let addressAlias = this.formModel.address
        this.formModel.address = ''
        if (addressAlias.indexOf('@') == -1) {
            return
        }
        const namespaceId = new NamespaceId(addressAlias.substring(1))
        try {
            const namespaceInfo = await new NamespaceApiRxjs().getNamespace(namespaceId, node).toPromise()
            this.formModel.address = namespaceInfo.alias.address
        } catch (e) {
            console.log(e)
            return false
        }
    }

    generateTransaction() {
        // TODO address alias
        let {address, remark, fee, mosaicTransferList, isEncrypted} = this.formModel
        this.formatAddress()
        if (!address || address.length < 40) {
            this.$Notice.error({
                title: 'address alias not exist'
            })
            return
        }

        const {xemDivisibility} = this
        const {networkType} = this.wallet
        fee = getAbsoluteMosaicAmount(fee, xemDivisibility)
        const transaction = new TransactionApiRxjs().transferTransaction(
            networkType,
            fee,
            address,
            mosaicTransferList,
            isEncrypted ? MessageType.EncryptedMessage : MessageType.PlainMessage,
            remark
        )
        this.transactionList = [transaction]
    }

    closeCheckPWDialog() {
        this.showCheckPWDialog = false
    }

    checkEnd(isPasswordRight) {
        if (!isPasswordRight) {
            this.$Notice.error({
                title: this.$t(Message.WRONG_PASSWORD_ERROR) + ''
            })
        }
    }

    @Watch('accountAddress')
    onAcountAddressChange() {
        this.resetFields()
    }

    @Watch('errors.items')
    onErrorsChanged() {
        this.submitDisabled = this.errors.items.length > 0
    }

    mounted() {
        this.resetFields()
    }
}
