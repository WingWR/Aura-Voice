<template>
  <scroll-view scroll-y class="page">
    <!-- 第一组：账户 -->
    <view class="section">
      <view class="item">
        <text class="item-text">账号与安全</text>
        <uni-icons type="forward" size="20" color="#bbb" />
      </view>
    </view>

    <!-- 第二组：偏好设置 -->
    <view class="section">
      <view class="item">
        <text class="item-text">通知设置</text>
        <uni-icons type="forward" size="20" color="#bbb" />
      </view>
      <view class="item">
        <text class="item-text">深色模式</text>
        <switch :checked="darkMode" @change="toggleDarkMode" />
      </view>
      <view class="item">
        <text class="item-text">语言</text>
        <uni-icons type="forward" size="20" color="#bbb" />
      </view>
    </view>

    <!-- 第三组：关于 -->
    <view class="section">
      <view class="item">
        <text class="item-text">关于应用</text>
        <uni-icons type="forward" size="20" color="#bbb" />
      </view>
      <view class="item">
        <text class="item-text">检查更新</text>
        <text class="item-right">v1.0.0</text>
      </view>
    </view>

    <!-- 退出登录 -->
    <view class="section">
      <view class="item logout" @click="logout">
        <text class="logout-text">退出登录</text>
      </view>
    </view>
  </scroll-view>
</template>

<script setup>
import { ref } from 'vue'

const darkMode = ref(false)

function toggleDarkMode(e) {
  darkMode.value = e.detail.value
  uni.showToast({
    title: darkMode.value ? '已启用深色模式' : '已关闭深色模式',
    icon: 'none'
  })
}

function logout() {
  uni.showModal({
    title: '提示',
    content: '确定要退出登录吗？',
    success: res => {
      if (res.confirm) {
        uni.showToast({ title: '已退出登录', icon: 'none' })
        // 这里可以跳转到登录页或清除 token
      }
    }
  })
}
</script>

<style scoped>
.page {
  background-color: #f5f5f5;
  padding-top: 20rpx;
}

.section {
  background-color: #ffffff;
  margin-top: 20rpx;
  border-radius: 10rpx;
  overflow: hidden;
}

.item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 30rpx;
  border-bottom: 1rpx solid #f0f0f0;
}

.item:last-child {
  border-bottom: none;
}

.item-text {
  font-size: 32rpx;
  color: #333333;
}

.item-right {
  font-size: 28rpx;
  color: #888888;
}

.logout {
  justify-content: center;
}

.logout-text {
  color: red;
  font-size: 32rpx;
}
</style>
