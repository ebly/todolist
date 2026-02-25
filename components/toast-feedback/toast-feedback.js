Component({
  properties: {
    duration: {
      type: Number,
      value: 1500
    }
  },

  data: {
    show: false,
    type: 'success',
    message: '',
    icon: '✓'
  },

  methods: {
    show(options = {}) {
      const { type = 'success', message = '', icon } = options;
      
      // 根据类型设置默认图标
      let defaultIcon = '✓';
      if (type === 'error') defaultIcon = '✕';
      if (type === 'warning') defaultIcon = '!';
      
      this.setData({
        show: true,
        type,
        message,
        icon: icon || defaultIcon
      });
      
      // 自动隐藏
      if (this.timer) clearTimeout(this.timer);
      this.timer = setTimeout(() => {
        this.hide();
      }, this.data.duration);
    },
    
    hide() {
      this.setData({ show: false });
    },
    
    success(message, icon) {
      this.show({ type: 'success', message, icon });
    },
    
    error(message, icon) {
      this.show({ type: 'error', message, icon });
    },
    
    warning(message, icon) {
      this.show({ type: 'warning', message, icon });
    }
  }
});
