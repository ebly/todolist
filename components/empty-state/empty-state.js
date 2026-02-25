Component({
  properties: {
    icon: {
      type: String,
      value: '📋'
    },
    title: {
      type: String,
      value: '暂无数据'
    },
    desc: {
      type: String,
      value: ''
    },
    showAction: {
      type: Boolean,
      value: false
    },
    actionText: {
      type: String,
      value: '去添加'
    }
  },

  methods: {
    onActionTap() {
      this.triggerEvent('action');
    }
  }
});
