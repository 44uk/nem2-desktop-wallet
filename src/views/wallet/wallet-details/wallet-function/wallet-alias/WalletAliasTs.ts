import {Message} from "@/config/index.ts"
import {Component, Vue, Watch} from 'vue-property-decorator'
import {EmptyAlias} from "nem2-sdk/dist/src/model/namespace/EmptyAlias"
import {NamespaceApiRxjs} from "@/core/api/NamespaceApiRxjs.ts"
import {Address, AddressAlias, AliasActionType, NamespaceId, Password} from "nem2-sdk"
import {AppWallet} from "@/core/utils/wallet.ts"
import {formatAddress, formatSeconds} from "@/core/utils/utils.ts"
import {mapState} from "vuex"

@Component({
    computed: {
        ...mapState({
            activeAccount: 'account',
            app: 'app'
        })
    }
})
export class WalletAliasTs extends Vue {
    activeAccount: any
    app: any
    isShowDialog = false
    isShowDeleteIcon = false
    showCheckPWDialog = false
    isCompleteForm = true
    aliasList = []
    aliasListIndex = -1
    aliasActionTypeList = []
    formItem = {
        address: '',
        alias: '',
        fee: 1,
        password: ''
    }

    get getWallet() {
        return this.activeAccount.wallet
    }

    get namespaceList() {
        return this.activeAccount.namespace
    }

    get generationHash() {
        return this.activeAccount.generationHash
    }

    get node() {
        return this.activeAccount.node
    }

    get nowBlockHeihgt() {
        return this.app.chainStatus.currentHeight
    }

    showUnLink(index) {
        this.aliasListIndex = index
        this.formItem = {
            address: this.aliasList[index].alias.address,
            alias: this.aliasList[index].name,
            fee: 1,
            password: ''
        }
        this.isShowDialog = true
    }

    closeModel() {
        this.isShowDialog = false
        this.aliasListIndex = -1
        this.formItem = {
            address: '',
            alias: '',
            fee: 1,
            password: ''
        }
    }

    checkForm(): boolean {
        const {address, alias, fee, password} = this.formItem
        if (address.length < 40) {
            this.showErrorMessage(this.$t(Message.ADDRESS_FORMAT_ERROR))
            return false
        }
        if (!(alias || alias.trim())) {
            this.showErrorMessage(this.$t(Message.INPUT_EMPTY_ERROR) + '')
            return false
        }
        if (!(password || password.trim())) {
            this.showErrorMessage(this.$t(Message.INPUT_EMPTY_ERROR) + '')
            return false
        }
        if ((!Number(fee) && Number(fee) !== 0) || Number(fee) < 0) {
            this.showErrorMessage(this.$t(Message.FEE_LESS_THAN_0_ERROR))
            return false
        }

        if (password.length < 8) {
            this.showErrorMessage(this.$t('password_error') + '')
            return false
        }

        const validPassword = new AppWallet(this.getWallet).checkPassword(new Password(password))

        if (!validPassword) {
            this.showErrorMessage(this.$t('password_error') + '')
            return false
        }
        return true
    }

    showErrorMessage(message) {
        this.$Notice.destroy()
        this.$Notice.error({
            title: message
        })
    }

    submit() {
        if (!this.isCompleteForm) return
        if (!this.checkForm()) return
        if (this.aliasListIndex >= 0) {
            this.addressAlias(false)
        } else {
            this.addressAlias(true)
        }
    }

    addressAlias(type) {
        let transaction = new NamespaceApiRxjs().addressAliasTransaction(
            type ? AliasActionType.Link : AliasActionType.Unlink,
            new NamespaceId(this.formItem.alias),
            Address.createFromRawAddress(this.formItem.address),
            this.getWallet.networkType,
            this.formItem.fee
        )
        const {node, generationHash} = this
        const password = new Password(this.formItem.password)

        new AppWallet(this.getWallet).signAndAnnounceNormal(password, node, generationHash, [transaction], this)
        this.closeModel()
    }

    formatAddress(address) {
        return formatAddress(address)
    }

    computeDuration(duration) {
        let expireTime = duration - this.nowBlockHeihgt > 0 ? this.durationToTime(duration - this.nowBlockHeihgt) : 'Expired'
        return expireTime
    }

    durationToTime(duration) {
        const durationNum = Number(duration)
        return formatSeconds(durationNum * 12)

    }

    initData() {
        let list = []
        let addressAliasList = []
        this.namespaceList.map((item) => {
            if (item.alias instanceof EmptyAlias) {
                list.push(item)
            } else if (item.alias instanceof AddressAlias) {
                addressAliasList.push(item)
            }
        })
        this.aliasActionTypeList = list
        this.aliasList = addressAliasList
    }

    @Watch('namespaceList')
    onNamespaceListChange() {
        this.initData()
    }

    // @Watch('formItem', {immediate: true, deep: true})
    // onFormItemChange() {
    //     const {address, alias, password, fee} = this.formItem
    //     // isCompleteForm
    //     this.isCompleteForm = address !== '' && alias !== '' && password !== '' && fee > 0
    // }

    mounted() {
        this.initData()
    }
}
