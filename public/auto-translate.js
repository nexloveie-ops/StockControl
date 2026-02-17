// 自动翻译插件 - 类似 Chrome 浏览器翻译功能
// 使用 Google Translate API (免费版本通过 MyMemory API)

const AutoTranslate = {
  // 当前语言
  currentLang: localStorage.getItem('language') || 'zh',
  targetLang: 'en',
  
  // 翻译缓存
  cache: {},
  
  // 是否正在翻译
  isTranslating: false,
  
  // 需要排除的元素选择器
  excludeSelectors: [
    'script',
    'style',
    'noscript',
    'iframe',
    'svg',
    'path',
    'code',
    'pre',
    '[data-no-translate]',
    '.no-translate'
  ],
  
  // 初始化
  init() {
    console.log('🌐 自动翻译插件已加载');
    this.createTranslateButton();
    this.loadCache();
  },
  
  // 创建翻译按钮
  createTranslateButton() {
    // 检查是否已存在
    if (document.getElementById('autoTranslateButton')) {
      return;
    }
    
    const button = document.createElement('div');
    button.id = 'autoTranslateButton';
    button.style.cssText = `
      position: fixed;
      bottom: 70px;
      right: 20px;
      z-index: 9998;
      background: white;
      border-radius: 25px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
      padding: 8px 16px;
      display: flex;
      align-items: center;
      gap: 8px;
      cursor: pointer;
      transition: all 0.3s;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      font-size: 14px;
      font-weight: 500;
      border: 2px solid #e5e7eb;
    `;
    
    button.innerHTML = `
      <span style="font-size: 18px;">🌍</span>
      <span id="translateButtonText">自动翻译</span>
      <span id="translateStatus" style="font-size: 12px; color: #666;"></span>
    `;
    
    button.addEventListener('mouseenter', () => {
      button.style.transform = 'scale(1.05)';
      button.style.boxShadow = '0 4px 15px rgba(0,0,0,0.15)';
    });
    
    button.addEventListener('mouseleave', () => {
      button.style.transform = 'scale(1)';
      button.style.boxShadow = '0 2px 10px rgba(0,0,0,0.1)';
    });
    
    button.addEventListener('click', () => {
      this.toggleTranslate();
    });
    
    document.body.appendChild(button);
    
    // 添加移动端适配
    const style = document.createElement('style');
    style.textContent = `
      @media (max-width: 768px) {
        #autoTranslateButton {
          bottom: 60px !important;
          right: 10px !important;
          padding: 6px 12px !important;
          font-size: 12px !important;
        }
        #autoTranslateButton span:first-child {
          font-size: 16px !important;
        }
      }
    `;
    document.head.appendChild(style);
  },
  
  // 切换翻译
  async toggleTranslate() {
    if (this.isTranslating) {
      this.stopTranslate();
    } else {
      await this.startTranslate();
    }
  },
  
  // 开始翻译
  async startTranslate() {
    if (this.isTranslating) return;
    
    this.isTranslating = true;
    const button = document.getElementById('autoTranslateButton');
    const statusSpan = document.getElementById('translateStatus');
    const textSpan = document.getElementById('translateButtonText');
    
    button.style.background = '#dbeafe';
    button.style.borderColor = '#3b82f6';
    textSpan.textContent = '翻译中...';
    statusSpan.textContent = '';
    
    try {
      // 获取所有需要翻译的文本节点
      const textNodes = this.getTextNodes();
      console.log(`📝 找到 ${textNodes.length} 个文本节点`);
      
      // 批量翻译
      let translated = 0;
      const batchSize = 10; // 每批翻译10个
      
      for (let i = 0; i < textNodes.length; i += batchSize) {
        const batch = textNodes.slice(i, i + batchSize);
        await this.translateBatch(batch);
        translated += batch.length;
        
        // 更新进度
        const progress = Math.round((translated / textNodes.length) * 100);
        statusSpan.textContent = `${progress}%`;
        
        // 避免请求过快
        await this.sleep(100);
      }
      
      textSpan.textContent = '已翻译';
      statusSpan.textContent = '✓';
      button.style.background = '#dcfce7';
      button.style.borderColor = '#10b981';
      
      // 保存翻译状态
      this.saveCache();
      
      console.log('✅ 翻译完成');
    } catch (error) {
      console.error('❌ 翻译失败:', error);
      textSpan.textContent = '翻译失败';
      statusSpan.textContent = '✗';
      button.style.background = '#fee2e2';
      button.style.borderColor = '#ef4444';
      this.isTranslating = false;
    }
  },
  
  // 停止翻译（恢复原文）
  stopTranslate() {
    this.isTranslating = false;
    const button = document.getElementById('autoTranslateButton');
    const textSpan = document.getElementById('translateButtonText');
    const statusSpan = document.getElementById('translateStatus');
    
    // 刷新页面恢复原文
    location.reload();
  },
  
  // 获取所有文本节点
  getTextNodes() {
    const textNodes = [];
    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: (node) => {
          // 跳过排除的元素
          let parent = node.parentElement;
          while (parent) {
            if (this.excludeSelectors.some(sel => parent.matches && parent.matches(sel))) {
              return NodeFilter.FILTER_REJECT;
            }
            parent = parent.parentElement;
          }
          
          // 只处理有实际文本内容的节点
          const text = node.textContent.trim();
          if (text.length > 0 && this.shouldTranslate(text)) {
            return NodeFilter.FILTER_ACCEPT;
          }
          return NodeFilter.FILTER_REJECT;
        }
      }
    );
    
    let node;
    while (node = walker.nextNode()) {
      textNodes.push(node);
    }
    
    return textNodes;
  },
  
  // 判断是否需要翻译
  shouldTranslate(text) {
    // 跳过纯数字、符号、空白
    if (/^[\d\s\p{P}€$¥£]+$/u.test(text)) {
      return false;
    }
    
    // 跳过纯英文（已经是英文了）
    if (/^[a-zA-Z\s\d\p{P}]+$/u.test(text)) {
      return false;
    }
    
    // 跳过太短的文本
    if (text.length < 2) {
      return false;
    }
    
    return true;
  },
  
  // 批量翻译
  async translateBatch(nodes) {
    const promises = nodes.map(node => this.translateNode(node));
    await Promise.all(promises);
  },
  
  // 翻译单个节点
  async translateNode(node) {
    const originalText = node.textContent.trim();
    
    // 检查缓存
    if (this.cache[originalText]) {
      node.textContent = node.textContent.replace(originalText, this.cache[originalText]);
      return;
    }
    
    try {
      const translated = await this.translate(originalText);
      if (translated && translated !== originalText) {
        // 保存到缓存
        this.cache[originalText] = translated;
        
        // 替换文本
        node.textContent = node.textContent.replace(originalText, translated);
      }
    } catch (error) {
      console.warn('翻译失败:', originalText, error);
    }
  },
  
  // 翻译文本（使用 MyMemory API - 免费）
  async translate(text) {
    try {
      // 使用 MyMemory Translation API (免费，每天限制1000次)
      const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=zh|en`;
      
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.responseStatus === 200 && data.responseData) {
        return data.responseData.translatedText;
      }
      
      return text;
    } catch (error) {
      console.error('API 调用失败:', error);
      return text;
    }
  },
  
  // 备用翻译方法（使用 LibreTranslate - 需要自建服务器）
  async translateLibre(text) {
    try {
      const response = await fetch('https://libretranslate.de/translate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          q: text,
          source: 'zh',
          target: 'en',
          format: 'text'
        })
      });
      
      const data = await response.json();
      return data.translatedText || text;
    } catch (error) {
      console.error('LibreTranslate 失败:', error);
      return text;
    }
  },
  
  // 保存缓存
  saveCache() {
    try {
      localStorage.setItem('translateCache', JSON.stringify(this.cache));
    } catch (error) {
      console.warn('保存缓存失败:', error);
    }
  },
  
  // 加载缓存
  loadCache() {
    try {
      const cached = localStorage.getItem('translateCache');
      if (cached) {
        this.cache = JSON.parse(cached);
        console.log(`📦 加载了 ${Object.keys(this.cache).length} 条翻译缓存`);
      }
    } catch (error) {
      console.warn('加载缓存失败:', error);
      this.cache = {};
    }
  },
  
  // 清除缓存
  clearCache() {
    this.cache = {};
    localStorage.removeItem('translateCache');
    console.log('🗑️ 翻译缓存已清除');
  },
  
  // 延迟函数
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
};

// 页面加载完成后初始化
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => AutoTranslate.init());
} else {
  AutoTranslate.init();
}

// 导出到全局
window.AutoTranslate = AutoTranslate;
