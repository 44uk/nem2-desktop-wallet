<template>
  <div class="walletSwitchWrap">
    <div class="walletSwitchHead">
      <p class="tit">{{$t('Wallet_management')}}</p>
    </div>
    <div class="walletList">
      <div :class="['walletItem', item.style, item.active || walletList.length === 1 ? 'active':'','radius']"
           @click="switchWallet(item.address)"
           v-for="(item, index) in walletList" :key="index">
        <Row>
          <Col span="15">
            <div>
              <p class="walletName">{{item.name}}</p>
              <p class="walletAmount overflow_ellipsis">
                {{formatNumber(getWalletBalance(index) ) }}
                &nbsp;<span class="tails">XEM</span>
              </p>
            </div>
          </Col>
          <Col span="9">
            <div @click.stop>
              <p class="walletTypeTxt">{{item.isMultisig ? $t('Public_account') : ''}}</p>
              <div class="options">
                <Poptip placement="bottom">
                  <img src="@/common/img/wallet/moreActive.png">
                  <div slot="content">
                    <p
                            class="optionItem"
                            @click.stop="walletToDelete = item; showCheckPWDialog = true"
                    >
                      <i><img src="@/common/img/wallet/delete.png"></i>
                      <span>{{$t('delete')}}</span>
                    </p>
                  </div>
                </Poptip>
              </div>
            </div>
          </Col>
        </Row>
      </div>
    </div>

    <div class="walletMethod">
      <Row>
        <Col span="12">
          <div class="createBtn pointer" @click="toCreate">{{$t('create')}}</div>
        </Col>
        <Col span="12">
          <div class="importBtn pointer" @click="toImport">{{$t('import')}}</div>
        </Col>
      </Row>
    </div>
    <DeleteWalletCheck
            :showCheckPWDialog="showCheckPWDialog"
            :wallet-to-delete="walletToDelete"
            @closeCheckPWDialog="closeCheckPWDialog"
    />
  </div>
</template>

<script lang="ts">
    import './WalletSwitch.less'
    //@ts-ignore
    import {WalletSwitchTs} from '@/views/wallet/wallet-switch/WalletSwitchTs.ts'

    export default class WalletSwitch extends WalletSwitchTs {

    }
</script>

<style scoped>

</style>
