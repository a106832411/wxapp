<template>
  <view class="chat-page">
    <!-- 侧边弹出层（从左向右滑出） -->
    <view 
      class="sidebar-mask" 
      v-if="showSidebar"
      @click="toggleSidebar"
    ></view>
    <view 
      class="sidebar" 
      v-if="showSidebar"
      :class="{ slideIn: showSidebar }"
    >
      <view class="sidebar-header">
        <text class="sidebar-title">功能菜单</text>
        <button class="close-btn" @click="toggleSidebar">✕</button>
      </view>
      <view class="sidebar-menu">
        <view class="menu-item" @click="clearHistory">
          <text class="menu-icon">🗑️</text>
          <text class="menu-text">清空聊天记录</text>
        </view>
        <view class="menu-item" @click="switchTheme">
          <text class="menu-icon">🎨</text>
          <text class="menu-text">切换主题</text>
        </view>
        <view class="menu-item" @click="showSettings">
          <text class="menu-icon">⚙️</text>
          <text class="menu-text">设置</text>
        </view>
        <view class="menu-item" @click="showAbout">
          <text class="menu-icon">ℹ️</text>
          <text class="menu-text">关于</text>
        </view>
      </view>
    </view>
    
    <!-- 顶部导航栏（左侧为三道杠按钮） -->
    <view class="chat-header">
      <button class="menu-trigger" @click="toggleSidebar">
        <text class="hamburger">☰</text>
      </button>
      <view class="header-content">
        <text class="header-title">聊天</text>
      </view>
      <view class="header-placeholder"></view> <!-- 占位元素，保持标题居中 -->
    </view>
    
    <!-- 聊天内容区域 -->
    <scroll-view 
      class="chat-container" 
      scroll-y 
      :scroll-top="scrollTop"
      :style="{ transform: showSidebar ? 'translateX(70%)' : 'translateX(0)' }"
      @scroll="onScroll"
    >
      <!-- 时间分割线 -->
      <view class="time-divider" v-if="showTimeDivider">
        <text>{{ formatTime(new Date()) }}</text>
      </view>
      
      <!-- 欢迎消息 -->
      <view class="message-item ai-message" v-if="messages.length === 0">
        <view class="avatar">
          <image src="/static/ai-avatar.png" mode="widthFix"></image>
        </view>
        <view class="message-bubble">
          <text>你好！我是你的助手，有什么可以帮助你的吗？</text>
        </view>
      </view>
      
      <!-- 消息列表 -->
      <view 
        v-for="(msg, index) in messages" 
        :key="index" 
        :class="['message-item', msg.isUser ? 'user-message' : 'ai-message']"
      >
        <view class="avatar">
          <image 
            :src="msg.isUser ? '/static/user-avatar.png' : '/static/ai-avatar.png'" 
            mode="widthFix"
          ></image>
        </view>
        <view 
          class="message-bubble" 
          :class="{ voice: msg.isVoice }"
          @click="msg.isVoice && playVoice(msg, index)"
        >
          <template v-if="msg.isVoice">
            <view class="voice-content">
              <view class="voice-wave" :class="{ playing: msg.isPlaying }">
                <view class="wave-bar"></view>
                <view class="wave-bar"></view>
                <view class="wave-bar"></view>
              </view>
              <text class="voice-duration">{{ msg.duration }}"</text>
            </view>
          </template>
          <template v-else>
            <text>{{ msg.content }}</text>
          </template>
        </view>
      </view>
      
      <!-- 加载状态 -->
      <view class="loading-indicator" v-if="isLoading">
        <view class="loading-dot"></view>
        <view class="loading-dot"></view>
        <view class="loading-dot"></view>
      </view>
    </scroll-view>
    
    <!-- 输入区域 -->
    <view class="input-container" :style="{ transform: showSidebar ? 'translateX(70%)' : 'translateX(0)' }">
      <!-- 主输入栏 -->
      <view class="input-bar">
        <!-- 左侧：语音/打字切换按钮 -->
        <button 
          class="switch-btn" 
          @click="toggleMode"
        >
          {{ isTextMode ? '🎤' : '⌨️' }}
        </button>
        
        <!-- 中间：输入框（默认一行） -->
        <view class="input-wrapper">
          <!-- 文字输入模式 -->
          <textarea 
            v-if="isTextMode"
            class="text-input" 
            placeholder="请输入消息..." 
            v-model="inputMessage"
            :style="{ height: textareaHeight + 'px' }"
            @input="adjustTextareaHeight"
            @focus="onInputFocus"
            @blur="onInputBlur"
            @confirm="sendMessage"
          ></textarea>
          
          <!-- 语音输入模式 -->
          <view 
            v-else 
            class="voice-input"
            @touchstart="startRecording"
            @touchend="handleRecordEnd"
            @touchmove="handleTouchMove"
            @touchcancel="stopRecording(true)"
          >
            <text class="voice-hint">{{ isRecording ? '松开发送' : '按住说话' }}</text>
          </view>
        </view>
        
        <!-- 右侧：加号按钮 -->
        <button 
          class="plus-btn" 
          @click.stop="toggleFunctionButtons"
        >
          +
        </button>
      </view>
      
      <!-- 底部功能按钮 -->
      <view class="function-buttons" v-if="showFunctionButtons">
        <view class="function-item" @click="chooseImage">
          <view class="func-icon">📷</view>
          <text class="func-text">相册</text>
        </view>
        <view class="function-item" @click="takePhoto">
          <view class="func-icon">📸</view>
          <text class="func-text">拍摄</text>
        </view>
        <view class="function-item" @click="sendLocation">
          <view class="func-icon">📍</view>
          <text class="func-text">位置</text>
        </view>
        <view class="function-item" @click="showMore">
          <view class="func-icon">⋮</view>
          <text class="func-text">更多</text>
        </view>
      </view>
    </view>
    
    <!-- 语音录制提示 -->
    <view class="voice-recording-toast" v-if="isRecording && !showSidebar">
      <view class="recording-icon">{{ isCancel ? '✕' : '🎤' }}</view>
      <text class="recording-text">{{ isCancel ? '松开取消' : '正在录音...' }}</text>
      <text class="recording-time">{{ recordingTime }}"</text>
    </view>
  </view>
</template>

<script>
export default {
  data() {
    return {
      messages: [],
      inputMessage: '',
      isTextMode: true,
      isRecording: false,
      isLoading: false,
      scrollTop: 0,
      showTimeDivider: true,
      textareaHeight: 36, // 默认一行高度
      isInputFocused: false,
      recordingTime: 0,
      recordingTimer: null,
      recorderManager: null,
      innerAudioContext: null,
      isCancel: false,
      startY: 0,
      showFunctionButtons: false,
      currentPlayingIndex: -1,
      showSidebar: false, // 侧边栏显示状态
      darkMode: false // 主题切换
    };
  },
  onLoad() {
    // 初始化录音和音频播放
    this.recorderManager = uni.getRecorderManager();
    this.innerAudioContext = uni.createInnerAudioContext();
    this.innerAudioContext.onEnded(() => this.stopVoicePlay());
    
    // 监听录音完成事件
    this.recorderManager.onStop((res) => {
      if (!this.isCancel && this.recordingTime >= 1) {
        this.messages.push({
          content: '[语音消息]',
          isUser: true,
          isVoice: true,
          duration: this.recordingTime,
          filePath: res.tempFilePath,
          isPlaying: false,
          timestamp: Date.now()
        });
        this.saveHistory();
        this.scrollToBottom();
        this.getAIResponse('语音消息');
      }
    });
    
    // 加载历史记录
    this.loadHistory();
  },
  onUnload() {
    this.stopVoicePlay();
    this.innerAudioContext.destroy();
    this.saveHistory();
  },
  methods: {
    // 格式化时间
    formatTime(date) {
      const hours = date.getHours().toString().padStart(2, '0');
      const minutes = date.getMinutes().toString().padStart(2, '0');
      return `${hours}:${minutes}`;
    },
    
    // 加载/保存历史记录
    loadHistory() {
      const history = uni.getStorageSync('aiChatHistory');
      if (history && history.length) {
        this.messages = history;
        this.scrollToBottom();
        this.showTimeDivider = false;
      }
    },
    saveHistory() {
      if (this.messages.length) {
        uni.setStorageSync('aiChatHistory', this.messages);
      }
    },
    
    // 切换语音/文字输入模式
    toggleMode() {
      this.isTextMode = !this.isTextMode;
      this.inputMessage = '';
      this.showFunctionButtons = false;
    },
    
    // 发送文字消息
    sendMessage() {
      if (!this.isTextMode || !this.inputMessage.trim()) return;
      
      const userMsg = {
        content: this.inputMessage.trim(),
        isUser: true,
        isVoice: false,
        timestamp: Date.now()
      };
      
      this.messages.push(userMsg);
      this.inputMessage = '';
      this.textareaHeight = 36;
      this.saveHistory();
      this.scrollToBottom();
      this.getAIResponse(userMsg.content);
    },
    
    // AI回复模拟
    getAIResponse(input) {
      this.isLoading = true;
      setTimeout(() => {
        let response = input.includes('语音') 
          ? '我收到了你的语音消息，这是回复~' 
          : `你说："${input}"，这是我的回复`;
        
        this.messages.push({
          content: response,
          isUser: false,
          isVoice: false,
          timestamp: Date.now()
        });
        this.isLoading = false;
        this.saveHistory();
        this.scrollToBottom();
      }, 1500);
    },
    
    // 录音功能
    startRecording(e) {
      if (this.isTextMode) return;
      
      this.startY = e.touches[0].clientY;
      this.isCancel = false;
      this.isRecording = true;
      this.recordingTime = 0;
      
      this.recorderManager.start({
        duration: 60000,
        format: 'mp3'
      });
      
      this.recordingTimer = setInterval(() => {
        this.recordingTime++;
        if (this.recordingTime >= 60) this.handleRecordEnd();
      }, 1000);
    },
    
    handleRecordEnd(e) {
      if (!this.isRecording) return;
      
      const currentY = e?.changedTouches?.[0]?.clientY || this.startY;
      this.isCancel = this.startY - currentY > 50;
      this.stopRecording(this.isCancel);
    },
    
    stopRecording(cancel) {
      if (!this.isRecording) return;
      
      this.recorderManager.stop();
      this.isRecording = false;
      clearInterval(this.recordingTimer);
      
      if (cancel) {
        uni.showToast({ title: '已取消', icon: 'none' });
      } else if (this.recordingTime < 1) {
        uni.showToast({ title: '录音时间太短', icon: 'none' });
      }
      
      setTimeout(() => {
        this.recordingTime = 0;
        this.isCancel = false;
      }, 500);
    },
    
    handleTouchMove(e) {
      if (!this.isRecording) return;
      this.isCancel = this.startY - e.touches[0].clientY > 50;
    },
    
    // 语音播放
    playVoice(msg, index) {
      if (this.currentPlayingIndex === index) {
        this.stopVoicePlay();
        return;
      }
      
      this.stopVoicePlay();
      this.currentPlayingIndex = index;
      this.messages[index].isPlaying = true;
      
      if (msg.filePath) {
        this.innerAudioContext.src = msg.filePath;
        this.innerAudioContext.play();
      } else {
        setTimeout(() => this.stopVoicePlay(), msg.duration * 1000);
      }
    },
    
    stopVoicePlay() {
      if (this.currentPlayingIndex !== -1) {
        this.messages[this.currentPlayingIndex].isPlaying = false;
        this.innerAudioContext.stop();
        this.currentPlayingIndex = -1;
      }
    },
    
    // 调整文本框高度
    adjustTextareaHeight(e) {
      // 限制最大高度为3行
      const height = e.target.scrollHeight;
      this.textareaHeight = height > 108 ? 108 : height;
    },
    
    // 滚动到底部
    scrollToBottom() {
      this.$nextTick(() => {
        const query = uni.createSelectorQuery().in(this);
        query.select('.chat-container').boundingClientRect(data => {
          this.scrollTop = data.scrollHeight;
        }).exec();
      });
    },
    
    // 输入框聚焦/失焦
    onInputFocus() {
      this.isInputFocused = true;
      this.showFunctionButtons = false;
    },
    onInputBlur() {
      this.isInputFocused = false;
    },
    
    // 切换底部功能按钮
    toggleFunctionButtons() {
      if (this.isInputFocused) {
        uni.hideKeyboard();
        this.isInputFocused = false;
      }
      this.showFunctionButtons = !this.showFunctionButtons;
    },
    
    // 功能按钮操作
    chooseImage() {
      this.showFunctionButtons = false;
      uni.chooseImage({ count: 1, sourceType: ['album'], success: (res) => {
        this.messages.push({
          content: '[图片]',
          isUser: true,
          isImage: true,
          imageUrl: res.tempFilePaths[0],
          timestamp: Date.now()
        });
        this.scrollToBottom();
      }});
    },
    takePhoto() {
      this.showFunctionButtons = false;
      uni.chooseImage({ count: 1, sourceType: ['camera'], success: (res) => {
        this.messages.push({
          content: '[拍摄图片]',
          isUser: true,
          isImage: true,
          imageUrl: res.tempFilePaths[0],
          timestamp: Date.now()
        });
        this.scrollToBottom();
      }});
    },
    sendLocation() {
      this.showFunctionButtons = false;
      uni.chooseLocation({ success: (res) => {
        this.messages.push({
          content: `[位置：${res.name}]`,
          isUser: true,
          isLocation: true,
          timestamp: Date.now()
        });
        this.scrollToBottom();
      }});
    },
    showMore() {
      this.showFunctionButtons = false;
      uni.showActionSheet({
        itemList: ['文件', '收藏', '转账', '名片'],
        success: (res) => {
          const items = ['文件', '收藏', '转账', '名片'];
          uni.showToast({ title: `选择了${items[res.tapIndex]}`, icon: 'none' });
        }
      });
    },
    
    // 侧边栏控制（核心功能：从左向右弹出）
    toggleSidebar() {
      this.showSidebar = !this.showSidebar;
      this.showFunctionButtons = false; // 侧边栏显示时隐藏功能按钮
      
      // 禁止背景滚动
      const container = uni.createSelectorQuery().in(this).select('.chat-container');
      container.fields({ scrollEnabled: true }, data => {
        container.scrollEnabled(!this.showSidebar).exec();
      }).exec();
    },
    
    // 侧边栏菜单功能
    clearHistory() {
      uni.showModal({
        title: '提示',
        content: '确定清空聊天记录？',
        success: (res) => {
          if (res.confirm) {
            this.messages = [];
            this.scrollToBottom();
            uni.removeStorageSync('aiChatHistory');
            this.toggleSidebar();
          }
        }
      });
    },
    switchTheme() {
      this.darkMode = !this.darkMode;
      uni.showToast({ title: this.darkMode ? '已切换深色模式' : '已切换浅色模式', icon: 'none' });
    },
    showSettings() {
      uni.showToast({ title: '设置功能', icon: 'none' });
      this.toggleSidebar();
    },
    showAbout() {
      uni.showToast({ title: '关于助手 v1.0', icon: 'none' });
      this.toggleSidebar();
    },
    
    onScroll() {
      if (this.showFunctionButtons) this.showFunctionButtons = false;
    }
  }
};
</script>

<style scoped>
.chat-page {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background-color: #f5f7fa;
  position: relative;
  overflow: hidden; /* 隐藏侧边栏超出部分 */
}

/* 侧边弹出层样式 */
.sidebar-mask {
  position: fixed;
  left: 0;
  right: 0;
  top: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  z-index: 100;
  opacity: 0;
  transition: opacity 0.3s ease;
}

.sidebar {
  position: fixed;
  left: 0;
  top: 0;
  bottom: 0;
  width: 70%;
  max-width: 300px;
  background-color: #fff;
  z-index: 101;
  transform: translateX(-100%);
  transition: transform 0.3s ease-out;
  box-shadow: 2px 0 10px rgba(0, 0, 0, 0.1);
}

.sidebar.slideIn {
  transform: translateX(0); /* 从左向右滑入 */
}

.sidebar-header {
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
  border-bottom: 1px solid #eee;
}

.sidebar-title {
  font-size: 18px;
  font-weight: 600;
  color: #333;
}

.close-btn {
  width: 36px;
  height: 36px;
  background: transparent;
  border: none;
  font-size: 20px;
  color: #666;
  display: flex;
  align-items: center;
  justify-content: center;
}

.sidebar-menu {
  padding-top: 10px;
}

.menu-item {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  color: #333;
}

.menu-item:active {
  background-color: #f5f5f5;
}

.menu-icon {
  font-size: 20px;
  margin-right: 15px;
  width: 24px;
  text-align: center;
}

.menu-text {
  font-size: 16px;
}

/* 顶部导航栏（含三道杠按钮） */
.chat-header {
  height: 48px;
  background-color: #fff;
  border-bottom: 1px solid #eee;
  display: flex;
  align-items: center;
  padding: 0 16px;
  z-index: 10;
  transition: transform 0.3s ease;
}

.menu-trigger {
  width: 40px;
  height: 40px;
  background: transparent;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 10px;
  padding: 0;
}

.hamburger {
  font-size: 24px;
  color: #333;
}

.header-content {
  flex: 1;
  display: flex;
  justify-content: center;
}

.header-title {
  font-size: 18px;
  font-weight: 600;
  color: #333;
}

.header-placeholder {
  width: 50px; /* 与左侧按钮宽度一致，保持标题居中 */
}

/* 聊天内容区域（侧边栏弹出时右移） */
.chat-container {
  flex: 1;
  padding: 16px;
  overflow-y: auto;
  box-sizing: border-box;
  transition: transform 0.3s ease-out;
  z-index: 1;
}

.time-divider {
  text-align: center;
  margin: 10px 0;
}

.time-divider text {
  font-size: 12px;
  color: #999;
  background: #e9eaec;
  padding: 3px 10px;
  border-radius: 10px;
}

.message-item {
  display: flex;
  margin-bottom: 15px;
  animation: fadeIn 0.3s ease;
}

.avatar {
  width: 40px;
  height: 40px;
  border-radius: 8px;
  overflow: hidden;
  flex-shrink: 0;
}

.avatar image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.message-bubble {
  max-width: 70%;
  padding: 8px 12px;
  border-radius: 18px;
  line-height: 1.5;
  word-wrap: break-word;
}

.ai-message {
  flex-direction: row;
}

.ai-message .message-bubble {
  background: #fff;
  margin-left: 10px;
  border-top-left-radius: 4px;
  box-shadow: 0 1px 2px rgba(0,0,0,0.05);
}

.user-message {
  flex-direction: row-reverse;
}

.user-message .message-bubble {
  background: #95ec69;
  margin-right: 10px;
  border-top-right-radius: 4px;
}

/* 语音消息样式 */
.voice-content {
  display: flex;
  align-items: center;
  padding: 5px 0;
}

.voice-wave {
  display: flex;
  align-items: center;
  gap: 3px;
  margin-right: 10px;
}

.voice-wave.playing .wave-bar {
  animation: wave 1s infinite ease-in-out;
}

.wave-bar {
  width: 3px;
  height: 20px;
  background: currentColor;
  border-radius: 3px;
}

.wave-bar:nth-child(2) {
  height: 30px;
  animation-delay: 0.2s;
}

.wave-bar:nth-child(3) {
  height: 15px;
  animation-delay: 0.4s;
}

@keyframes wave {
  0%, 100% { transform: scaleY(0.5); }
  50% { transform: scaleY(1); }
}

.voice-duration {
  font-size: 14px;
  opacity: 0.8;
}

/* 加载动画 */
.loading-indicator {
  display: flex;
  justify-content: center;
  padding: 10px 0;
}

.loading-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #999;
  margin: 0 4px;
  animation: bounce 1.4s infinite;
}

.loading-dot:nth-child(2) { animation-delay: 0.2s; }
.loading-dot:nth-child(3) { animation-delay: 0.4s; }

@keyframes bounce {
  0%, 80%, 100% { transform: scale(0); }
  40% { transform: scale(1); }
}

/* 输入区域（侧边栏弹出时右移） */
.input-container {
  background: #f0f0f0;
  border-top: 1px solid #e5e5e5;
  transition: transform 0.3s ease-out;
  z-index: 1;
}

/* 主输入栏 */
.input-bar {
  display: flex;
  align-items: center;
  padding: 8px 16px;
}

/* 左侧：语音/打字切换按钮 */
.switch-btn {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: #fff;
  border: 1px solid #ddd;
  margin-right: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  padding: 0;
}

/* 中间：输入框 */
.input-wrapper {
  flex: 1;
  position: relative;
}

.text-input {
  width: 100%;
  padding: 8px 16px;
  background: #fff;
  border: 1px solid #ddd;
  border-radius: 18px;
  font-size: 16px;
  resize: none;
  box-sizing: border-box;
  line-height: 1.5;
}

.text-input::placeholder {
  color: #999;
}

.voice-input {
  width: 100%;
  height: 36px;
  background: #fff;
  border: 1px solid #ddd;
  border-radius: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #333;
  font-size: 16px;
}

/* 右侧：加号按钮 */
.plus-btn {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: #fff;
  border: 1px solid #ddd;
  margin-left: 10px;
  font-size: 24px;
  color: #333;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
}

/* 底部功能按钮 */
.function-buttons {
  display: flex;
  padding: 10px 0;
  border-top: 1px solid #e5e5e5;
  background: #f0f0f0;
}

.function-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 10px 0;
}

.func-icon {
  width: 50px;
  height: 50px;
  background: #fff;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  margin-bottom: 8px;
  box-shadow: 0 2px 5px rgba(0,0,0,0.1);
}

.func-text {
  font-size: 12px;
  color: #333;
}

/* 语音录制提示 */
.voice-recording-toast {
  position: fixed;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  width: 120px;
  height: 120px;
  background: rgba(0,0,0,0.7);
  border-radius: 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #fff;
  z-index: 90;
}

.recording-icon {
  font-size: 40px;
  margin-bottom: 10px;
}

.recording-text {
  font-size: 16px;
  margin-bottom: 5px;
}

.recording-time {
  font-size: 14px;
  opacity: 0.8;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>