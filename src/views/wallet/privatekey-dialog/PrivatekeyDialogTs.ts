import {QRCodeGenerator} from 'nem2-qr-library'
import {Password} from 'nem2-sdk'
import {AppWallet} from '@/core/utils/wallet.ts'
import {Component, Vue, Prop, Watch} from 'vue-property-decorator'
import {Message} from "@/config"
import {mapState} from "vuex"

@Component({
    computed: {
        ...mapState({
            activeAccount: 'account',
        })
    }
})
export class PrivatekeyDialogTs extends Vue {
    QRCode = ''
    show = false
    stepIndex = 0
    activeAccount: any
    wallet = {
        password: '',
        privatekey: ''
    }

    @Prop()
    showPrivatekeyDialog: boolean

    get getWallet() {
        return this.activeAccount.wallet
    }

    get account() {
        return this.activeAccount
    }

    get generationHash() {
        return this.activeAccount.generationHash
    }

    privatekeyDialogCancel() {
        this.wallet = {
            password: '',
            privatekey: ''
        }
        this.$emit('closePrivatekeyDialog')
        setTimeout(() => {
            this.stepIndex = 0
        }, 300)
    }


    checkPassword() {
        if (!this.checkInput()) return
        try {
            const {privateKey} = new AppWallet(this.getWallet)
                .getAccount(new Password(this.wallet.password))
            
            this.stepIndex = 1
            this.wallet.password = ''
            this.stepIndex = 1
            this.wallet.privatekey = privateKey.toString().toUpperCase()
        } catch (e) {
            console.log(e)
            this.$Notice.destroy()
            this.$Notice.error({
                title: this.$t(Message.WRONG_PASSWORD_ERROR) + ''
            })
        }
    }


    exportPrivatekey() {
        switch (this.stepIndex) {
            case 0 :
                this.checkPassword()
                break
            case 1 :
                this.createQRCode()
                this.stepIndex = 2
                break
            case 2 :
                this.stepIndex = 3
                break
        }
    }

    checkInput() {
        if (!this.wallet.password || this.wallet.password == '') {
            this.$Notice.error({
                title: '' + this.$t(Message.PLEASE_SET_WALLET_PASSWORD_INFO)
            })
            return false
        }
        return true
    }

    toPrevPage() {
        this.stepIndex = 2
    }

    saveQRCode() {

    }

    createQRCode() {
        const {networkType} = this.getWallet
        const {generationHash} = this
        const object = {privateKey: this.wallet.privatekey}
        this.QRCode = QRCodeGenerator
            .createExportObject(object, networkType, generationHash)
            .toBase64()
    }

    @Watch('showPrivatekeyDialog')
    onShowPrivatekeyDialogChange() {
        this.show = this.showPrivatekeyDialog
    }
}
