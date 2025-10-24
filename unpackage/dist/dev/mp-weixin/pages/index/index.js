"use strict";
const common_vendor = require("../../common/vendor.js");
const common_assets = require("../../common/assets.js");
const _sfc_main = {
  data() {
    return {
      messages: [],
      inputMessage: "",
      isTextMode: true,
      isRecording: false,
      isLoading: false,
      scrollTop: 0,
      showTimeDivider: true,
      textareaHeight: 36,
      // 默认一行高度
      isInputFocused: false,
      recordingTime: 0,
      recordingTimer: null,
      recorderManager: null,
      innerAudioContext: null,
      isCancel: false,
      startY: 0,
      showFunctionButtons: false,
      currentPlayingIndex: -1,
      showSidebar: false,
      // 侧边栏显示状态
      darkMode: false
      // 主题切换
    };
  },
  onLoad() {
    this.recorderManager = common_vendor.index.getRecorderManager();
    this.innerAudioContext = common_vendor.index.createInnerAudioContext();
    this.innerAudioContext.onEnded(() => this.stopVoicePlay());
    this.recorderManager.onStop((res) => {
      if (!this.isCancel && this.recordingTime >= 1) {
        this.messages.push({
          content: "[语音消息]",
          isUser: true,
          isVoice: true,
          duration: this.recordingTime,
          filePath: res.tempFilePath,
          isPlaying: false,
          timestamp: Date.now()
        });
        this.saveHistory();
        this.scrollToBottom();
        this.getAIResponse("语音消息");
      }
    });
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
      const hours = date.getHours().toString().padStart(2, "0");
      const minutes = date.getMinutes().toString().padStart(2, "0");
      return `${hours}:${minutes}`;
    },
    // 加载/保存历史记录
    loadHistory() {
      const history = common_vendor.index.getStorageSync("aiChatHistory");
      if (history && history.length) {
        this.messages = history;
        this.scrollToBottom();
        this.showTimeDivider = false;
      }
    },
    saveHistory() {
      if (this.messages.length) {
        common_vendor.index.setStorageSync("aiChatHistory", this.messages);
      }
    },
    // 切换语音/文字输入模式
    toggleMode() {
      this.isTextMode = !this.isTextMode;
      this.inputMessage = "";
      this.showFunctionButtons = false;
    },
    // 发送文字消息
    sendMessage() {
      if (!this.isTextMode || !this.inputMessage.trim())
        return;
      const userMsg = {
        content: this.inputMessage.trim(),
        isUser: true,
        isVoice: false,
        timestamp: Date.now()
      };
      this.messages.push(userMsg);
      this.inputMessage = "";
      this.textareaHeight = 36;
      this.saveHistory();
      this.scrollToBottom();
      this.getAIResponse(userMsg.content);
    },
    // AI回复模拟
    getAIResponse(input) {
      this.isLoading = true;
      setTimeout(() => {
        let response = input.includes("语音") ? "我收到了你的语音消息，这是回复~" : `你说："${input}"，这是我的回复`;
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
      if (this.isTextMode)
        return;
      this.startY = e.touches[0].clientY;
      this.isCancel = false;
      this.isRecording = true;
      this.recordingTime = 0;
      this.recorderManager.start({
        duration: 6e4,
        format: "mp3"
      });
      this.recordingTimer = setInterval(() => {
        this.recordingTime++;
        if (this.recordingTime >= 60)
          this.handleRecordEnd();
      }, 1e3);
    },
    handleRecordEnd(e) {
      var _a, _b;
      if (!this.isRecording)
        return;
      const currentY = ((_b = (_a = e == null ? void 0 : e.changedTouches) == null ? void 0 : _a[0]) == null ? void 0 : _b.clientY) || this.startY;
      this.isCancel = this.startY - currentY > 50;
      this.stopRecording(this.isCancel);
    },
    stopRecording(cancel) {
      if (!this.isRecording)
        return;
      this.recorderManager.stop();
      this.isRecording = false;
      clearInterval(this.recordingTimer);
      if (cancel) {
        common_vendor.index.showToast({ title: "已取消", icon: "none" });
      } else if (this.recordingTime < 1) {
        common_vendor.index.showToast({ title: "录音时间太短", icon: "none" });
      }
      setTimeout(() => {
        this.recordingTime = 0;
        this.isCancel = false;
      }, 500);
    },
    handleTouchMove(e) {
      if (!this.isRecording)
        return;
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
        setTimeout(() => this.stopVoicePlay(), msg.duration * 1e3);
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
      const height = e.target.scrollHeight;
      this.textareaHeight = height > 108 ? 108 : height;
    },
    // 滚动到底部
    scrollToBottom() {
      this.$nextTick(() => {
        const query = common_vendor.index.createSelectorQuery().in(this);
        query.select(".chat-container").boundingClientRect((data) => {
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
        common_vendor.index.hideKeyboard();
        this.isInputFocused = false;
      }
      this.showFunctionButtons = !this.showFunctionButtons;
    },
    // 功能按钮操作
    chooseImage() {
      this.showFunctionButtons = false;
      common_vendor.index.chooseImage({ count: 1, sourceType: ["album"], success: (res) => {
        this.messages.push({
          content: "[图片]",
          isUser: true,
          isImage: true,
          imageUrl: res.tempFilePaths[0],
          timestamp: Date.now()
        });
        this.scrollToBottom();
      } });
    },
    takePhoto() {
      this.showFunctionButtons = false;
      common_vendor.index.chooseImage({ count: 1, sourceType: ["camera"], success: (res) => {
        this.messages.push({
          content: "[拍摄图片]",
          isUser: true,
          isImage: true,
          imageUrl: res.tempFilePaths[0],
          timestamp: Date.now()
        });
        this.scrollToBottom();
      } });
    },
    sendLocation() {
      this.showFunctionButtons = false;
      common_vendor.index.chooseLocation({ success: (res) => {
        this.messages.push({
          content: `[位置：${res.name}]`,
          isUser: true,
          isLocation: true,
          timestamp: Date.now()
        });
        this.scrollToBottom();
      } });
    },
    showMore() {
      this.showFunctionButtons = false;
      common_vendor.index.showActionSheet({
        itemList: ["文件", "收藏", "转账", "名片"],
        success: (res) => {
          const items = ["文件", "收藏", "转账", "名片"];
          common_vendor.index.showToast({ title: `选择了${items[res.tapIndex]}`, icon: "none" });
        }
      });
    },
    // 侧边栏控制（核心功能：从左向右弹出）
    toggleSidebar() {
      this.showSidebar = !this.showSidebar;
      this.showFunctionButtons = false;
      const container = common_vendor.index.createSelectorQuery().in(this).select(".chat-container");
      container.fields({ scrollEnabled: true }, (data) => {
        container.scrollEnabled(!this.showSidebar).exec();
      }).exec();
    },
    // 侧边栏菜单功能
    clearHistory() {
      common_vendor.index.showModal({
        title: "提示",
        content: "确定清空聊天记录？",
        success: (res) => {
          if (res.confirm) {
            this.messages = [];
            this.scrollToBottom();
            common_vendor.index.removeStorageSync("aiChatHistory");
            this.toggleSidebar();
          }
        }
      });
    },
    switchTheme() {
      this.darkMode = !this.darkMode;
      common_vendor.index.showToast({ title: this.darkMode ? "已切换深色模式" : "已切换浅色模式", icon: "none" });
    },
    showSettings() {
      common_vendor.index.showToast({ title: "设置功能", icon: "none" });
      this.toggleSidebar();
    },
    showAbout() {
      common_vendor.index.showToast({ title: "关于助手 v1.0", icon: "none" });
      this.toggleSidebar();
    },
    onScroll() {
      if (this.showFunctionButtons)
        this.showFunctionButtons = false;
    }
  }
};
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  return common_vendor.e({
    a: $data.showSidebar
  }, $data.showSidebar ? {
    b: common_vendor.o((...args) => $options.toggleSidebar && $options.toggleSidebar(...args))
  } : {}, {
    c: $data.showSidebar
  }, $data.showSidebar ? {
    d: common_vendor.o((...args) => $options.toggleSidebar && $options.toggleSidebar(...args)),
    e: common_vendor.o((...args) => $options.clearHistory && $options.clearHistory(...args)),
    f: common_vendor.o((...args) => $options.switchTheme && $options.switchTheme(...args)),
    g: common_vendor.o((...args) => $options.showSettings && $options.showSettings(...args)),
    h: common_vendor.o((...args) => $options.showAbout && $options.showAbout(...args)),
    i: $data.showSidebar ? 1 : ""
  } : {}, {
    j: common_vendor.o((...args) => $options.toggleSidebar && $options.toggleSidebar(...args)),
    k: $data.showTimeDivider
  }, $data.showTimeDivider ? {
    l: common_vendor.t($options.formatTime(/* @__PURE__ */ new Date()))
  } : {}, {
    m: $data.messages.length === 0
  }, $data.messages.length === 0 ? {
    n: common_assets._imports_0
  } : {}, {
    o: common_vendor.f($data.messages, (msg, index, i0) => {
      return common_vendor.e({
        a: msg.isUser ? "/static/user-avatar.png" : "/static/ai-avatar.png",
        b: msg.isVoice
      }, msg.isVoice ? {
        c: msg.isPlaying ? 1 : "",
        d: common_vendor.t(msg.duration)
      } : {
        e: common_vendor.t(msg.content)
      }, {
        f: msg.isVoice ? 1 : "",
        g: common_vendor.o(($event) => msg.isVoice && $options.playVoice(msg, index), index),
        h: index,
        i: common_vendor.n(msg.isUser ? "user-message" : "ai-message")
      });
    }),
    p: $data.isLoading
  }, $data.isLoading ? {} : {}, {
    q: $data.scrollTop,
    r: $data.showSidebar ? "translateX(70%)" : "translateX(0)",
    s: common_vendor.o((...args) => $options.onScroll && $options.onScroll(...args)),
    t: common_vendor.t($data.isTextMode ? "🎤" : "⌨️"),
    v: common_vendor.o((...args) => $options.toggleMode && $options.toggleMode(...args)),
    w: $data.isTextMode
  }, $data.isTextMode ? {
    x: $data.textareaHeight + "px",
    y: common_vendor.o([($event) => $data.inputMessage = $event.detail.value, (...args) => $options.adjustTextareaHeight && $options.adjustTextareaHeight(...args)]),
    z: common_vendor.o((...args) => $options.onInputFocus && $options.onInputFocus(...args)),
    A: common_vendor.o((...args) => $options.onInputBlur && $options.onInputBlur(...args)),
    B: common_vendor.o((...args) => $options.sendMessage && $options.sendMessage(...args)),
    C: $data.inputMessage
  } : {
    D: common_vendor.t($data.isRecording ? "松开发送" : "按住说话"),
    E: common_vendor.o((...args) => $options.startRecording && $options.startRecording(...args)),
    F: common_vendor.o((...args) => $options.handleRecordEnd && $options.handleRecordEnd(...args)),
    G: common_vendor.o((...args) => $options.handleTouchMove && $options.handleTouchMove(...args)),
    H: common_vendor.o(($event) => $options.stopRecording(true))
  }, {
    I: common_vendor.o((...args) => $options.toggleFunctionButtons && $options.toggleFunctionButtons(...args)),
    J: $data.showFunctionButtons
  }, $data.showFunctionButtons ? {
    K: common_vendor.o((...args) => $options.chooseImage && $options.chooseImage(...args)),
    L: common_vendor.o((...args) => $options.takePhoto && $options.takePhoto(...args)),
    M: common_vendor.o((...args) => $options.sendLocation && $options.sendLocation(...args)),
    N: common_vendor.o((...args) => $options.showMore && $options.showMore(...args))
  } : {}, {
    O: $data.showSidebar ? "translateX(70%)" : "translateX(0)",
    P: $data.isRecording && !$data.showSidebar
  }, $data.isRecording && !$data.showSidebar ? {
    Q: common_vendor.t($data.isCancel ? "✕" : "🎤"),
    R: common_vendor.t($data.isCancel ? "松开取消" : "正在录音..."),
    S: common_vendor.t($data.recordingTime)
  } : {});
}
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render], ["__scopeId", "data-v-1cf27b2a"]]);
wx.createPage(MiniProgramPage);
//# sourceMappingURL=../../../.sourcemap/mp-weixin/pages/index/index.js.map
