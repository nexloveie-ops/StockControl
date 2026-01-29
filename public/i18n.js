// 国际化（i18n）系统
const i18n = {
  // 当前语言
  currentLang: localStorage.getItem('language') || 'zh',
  
  // 翻译字典
  translations: {
    zh: {
      // 通用
      'company.name': 'CELESTIA TRADE PARTNERS LIMITED',
      'company.tagline': '专业的3C产品批发零售管理平台',
      'language': '语言',
      'logout': '退出登录',
      'save': '保存',
      'cancel': '取消',
      'confirm': '确认',
      'delete': '删除',
      'edit': '编辑',
      'search': '搜索',
      'filter': '筛选',
      'export': '导出',
      'import': '导入',
      'loading': '加载中...',
      'noData': '暂无数据',
      'success': '操作成功',
      'error': '操作失败',
      'close': '关闭',
      
      // 登录页面
      'login.title': '欢迎回来',
      'login.subtitle': '请登录您的账户以继续',
      'login.username': '用户名或邮箱',
      'login.password': '密码',
      'login.rememberMe': '记住我',
      'login.forgotPassword': '忘记密码？',
      'login.button': '登录',
      'login.testAccounts': '测试账号',
      'login.clickToLogin': '点击快速登录',
      'login.error.empty': '请输入用户名和密码',
      'login.error.invalid': '用户名或密码错误',
      'login.error.failed': '登录失败，请稍后重试',
      
      // 功能特性
      'feature.inventory': '智能库存管理',
      'feature.sales': '销售数据分析',
      'feature.supply': '供应链协同',
      'feature.reports': '实时报表统计',
      
      // 角色
      'role.admin': '管理员',
      'role.warehouse': '仓管员',
      'role.merchant.vip': 'VIP商户',
      'role.merchant.gold': 'Gold商户',
      'role.customer': '零售客户',
      
      // 导航菜单
      'nav.home': '首页',
      'nav.inventory': '库存管理',
      'nav.receiving': '入库管理',
      'nav.productManagement': '产品管理',
      'nav.sales': '销售管理',
      'nav.products': '产品管理',
      'nav.invoices': '销售发票',
      'nav.orders': '采购订单',
      'nav.suppliers': '供应商',
      'nav.users': '用户管理',
      
      // 统计卡片
      'stats.totalProducts': '总产品数',
      'stats.availableProducts': '可销售产品',
      'stats.accessories': '配件类',
      'stats.newDevices': '全新设备',
      'stats.usedDevices': '二手设备',
      'stats.suppliers': '供应商',
      
      // 产品相关
      'product.name': '产品名称',
      'product.category': '类别',
      'product.barcode': '条码',
      'product.serialNumber': '序列号',
      'product.quantity': '数量',
      'product.purchasePrice': '进货价',
      'product.retailPrice': '零售价',
      'product.wholesalePrice': '批发价',
      'product.taxClassification': '税务分类',
      'product.taxAmount': '税额',
      'product.status': '状态',
      'product.location': '位置',
      'product.supplier': '供应商',
      
      // 产品类别
      'category.accessory': '配件',
      'category.newDevice': '全新设备',
      'category.usedDevice': '二手设备',
      
      // 产品状态
      'status.available': '可销售',
      'status.damaged': '坏损',
      'status.scrapped': '报废',
      'status.sold': '已售',
      
      // 税务分类
      'tax.vat23': 'VAT 23%',
      'tax.marginVat0': 'Margin 0%',
      'tax.serviceVat13_5': 'Service 13.5%',
      
      // 库存管理
      'inventory.title': '库存管理',
      'inventory.groups': '产品分组',
      'inventory.totalStock': '总库存',
      'inventory.availableStock': '可用库存',
      'inventory.value': '库存价值',
      'inventory.sales30days': '30天销量',
      'inventory.estimatedMonths': '预计可售',
      'inventory.productCount': '产品数量',
      'inventory.details': '产品明细',
      'inventory.backToGroups': '返回分组',
      
      // 销售管理
      'sales.title': '销售管理',
      'sales.selectProduct': '选择产品',
      'sales.selectCustomer': '选择客户',
      'sales.cart': '购物车',
      'sales.discount': '折扣',
      'sales.subtotal': '小计',
      'sales.tax': '税额',
      'sales.total': '总计',
      'sales.createInvoice': '生成发票',
      'sales.downloadPDF': '下载PDF',
      
      // 入库管理
      'receiving.title': '入库管理',
      'receiving.addProduct': '添加产品',
      'receiving.productType': '产品类型',
      'receiving.selectSupplier': '选择供应商',
      'receiving.procurementDate': '采购日期',
      
      // 产品管理
      'productMgmt.title': '产品管理',
      'productMgmt.adjustPrice': '调整价格',
      'productMgmt.updateStatus': '更新状态',
      'productMgmt.changeLocation': '更改位置',
      'productMgmt.adjustQuantity': '调整数量',
      
      // 月份
      'month.current': '当月',
      'month.last30days': '过去30天',
      'months': '个月'
    },
    
    en: {
      // Common
      'company.name': 'CELESTIA TRADE PARTNERS LIMITED',
      'company.tagline': 'Professional 3C Product Wholesale & Retail Management Platform',
      'language': 'Language',
      'logout': 'Logout',
      'save': 'Save',
      'cancel': 'Cancel',
      'confirm': 'Confirm',
      'delete': 'Delete',
      'edit': 'Edit',
      'search': 'Search',
      'filter': 'Filter',
      'export': 'Export',
      'import': 'Import',
      'loading': 'Loading...',
      'noData': 'No Data',
      'success': 'Success',
      'error': 'Error',
      'close': 'Close',
      
      // Login Page
      'login.title': 'Welcome Back',
      'login.subtitle': 'Please login to your account to continue',
      'login.username': 'Username or Email',
      'login.password': 'Password',
      'login.rememberMe': 'Remember Me',
      'login.forgotPassword': 'Forgot Password?',
      'login.button': 'Login',
      'login.testAccounts': 'Test Accounts',
      'login.clickToLogin': 'Click to Quick Login',
      'login.error.empty': 'Please enter username and password',
      'login.error.invalid': 'Invalid username or password',
      'login.error.failed': 'Login failed, please try again later',
      
      // Features
      'feature.inventory': 'Smart Inventory Management',
      'feature.sales': 'Sales Data Analysis',
      'feature.supply': 'Supply Chain Collaboration',
      'feature.reports': 'Real-time Reports',
      
      // Roles
      'role.admin': 'Administrator',
      'role.warehouse': 'Warehouse Staff',
      'role.merchant.vip': 'VIP Merchant',
      'role.merchant.gold': 'Gold Merchant',
      'role.customer': 'Retail Customer',
      
      // Navigation
      'nav.home': 'Home',
      'nav.inventory': 'Inventory',
      'nav.receiving': 'Receiving',
      'nav.productManagement': 'Product Management',
      'nav.sales': 'Sales',
      'nav.products': 'Products',
      'nav.invoices': 'Invoices',
      'nav.orders': 'Purchase Orders',
      'nav.suppliers': 'Suppliers',
      'nav.users': 'Users',
      
      // Stats Cards
      'stats.totalProducts': 'Total Products',
      'stats.availableProducts': 'Available Products',
      'stats.accessories': 'Accessories',
      'stats.newDevices': 'New Devices',
      'stats.usedDevices': 'Used Devices',
      'stats.suppliers': 'Suppliers',
      
      // Product Related
      'product.name': 'Product Name',
      'product.category': 'Category',
      'product.barcode': 'Barcode',
      'product.serialNumber': 'Serial Number',
      'product.quantity': 'Quantity',
      'product.purchasePrice': 'Purchase Price',
      'product.retailPrice': 'Retail Price',
      'product.wholesalePrice': 'Wholesale Price',
      'product.taxClassification': 'Tax Classification',
      'product.taxAmount': 'Tax Amount',
      'product.status': 'Status',
      'product.location': 'Location',
      'product.supplier': 'Supplier',
      
      // Product Categories
      'category.accessory': 'Accessory',
      'category.newDevice': 'New Device',
      'category.usedDevice': 'Used Device',
      
      // Product Status
      'status.available': 'Available',
      'status.damaged': 'Damaged',
      'status.scrapped': 'Scrapped',
      'status.sold': 'Sold',
      
      // Tax Classifications
      'tax.vat23': 'VAT 23%',
      'tax.marginVat0': 'Margin 0%',
      'tax.serviceVat13_5': 'Service 13.5%',
      
      // Inventory Management
      'inventory.title': 'Inventory Management',
      'inventory.groups': 'Product Groups',
      'inventory.totalStock': 'Total Stock',
      'inventory.availableStock': 'Available Stock',
      'inventory.value': 'Inventory Value',
      'inventory.sales30days': '30-Day Sales',
      'inventory.estimatedMonths': 'Est. Months',
      'inventory.productCount': 'Product Count',
      'inventory.details': 'Product Details',
      'inventory.backToGroups': 'Back to Groups',
      
      // Sales Management
      'sales.title': 'Sales Management',
      'sales.selectProduct': 'Select Product',
      'sales.selectCustomer': 'Select Customer',
      'sales.cart': 'Shopping Cart',
      'sales.discount': 'Discount',
      'sales.subtotal': 'Subtotal',
      'sales.tax': 'Tax',
      'sales.total': 'Total',
      'sales.createInvoice': 'Create Invoice',
      'sales.downloadPDF': 'Download PDF',
      
      // Receiving Management
      'receiving.title': 'Receiving Management',
      'receiving.addProduct': 'Add Product',
      'receiving.productType': 'Product Type',
      'receiving.selectSupplier': 'Select Supplier',
      'receiving.procurementDate': 'Procurement Date',
      
      // Product Management
      'productMgmt.title': 'Product Management',
      'productMgmt.adjustPrice': 'Adjust Price',
      'productMgmt.updateStatus': 'Update Status',
      'productMgmt.changeLocation': 'Change Location',
      'productMgmt.adjustQuantity': 'Adjust Quantity',
      
      // Month
      'month.current': 'Current Month',
      'month.last30days': 'Last 30 Days',
      'months': 'months'
    }
  },
  
  // 获取翻译
  t(key) {
    return this.translations[this.currentLang][key] || key;
  },
  
  // 切换语言
  setLanguage(lang) {
    this.currentLang = lang;
    localStorage.setItem('language', lang);
    this.updatePageLanguage();
  },
  
  // 更新页面语言
  updatePageLanguage() {
    // 更新所有带有 data-i18n 属性的元素
    document.querySelectorAll('[data-i18n]').forEach(element => {
      const key = element.getAttribute('data-i18n');
      const translation = this.t(key);
      
      // 根据元素类型更新内容
      if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
        if (element.placeholder !== undefined) {
          element.placeholder = translation;
        }
      } else {
        element.textContent = translation;
      }
    });
    
    // 更新所有带有 data-i18n-placeholder 属性的元素
    document.querySelectorAll('[data-i18n-placeholder]').forEach(element => {
      const key = element.getAttribute('data-i18n-placeholder');
      element.placeholder = this.t(key);
    });
    
    // 更新所有带有 data-i18n-title 属性的元素
    document.querySelectorAll('[data-i18n-title]').forEach(element => {
      const key = element.getAttribute('data-i18n-title');
      element.title = this.t(key);
    });
    
    // 自动翻译常见文本（即使没有 data-i18n 属性）
    if (this.currentLang === 'en') {
      this.autoTranslate();
    }
    
    // 更新 HTML lang 属性
    document.documentElement.lang = this.currentLang === 'zh' ? 'zh-CN' : 'en';
    
    // 触发自定义事件，让页面可以响应语言变化
    window.dispatchEvent(new CustomEvent('languageChanged', { detail: { lang: this.currentLang } }));
  },
  
  // 自动翻译常见文本
  autoTranslate() {
    const textMap = {
      // 通用
      '加载中...': 'Loading...',
      '暂无数据': 'No Data',
      '搜索': 'Search',
      '筛选': 'Filter',
      '保存': 'Save',
      '取消': 'Cancel',
      '确认': 'Confirm',
      '删除': 'Delete',
      '编辑': 'Edit',
      '关闭': 'Close',
      
      // 统计
      '总产品数': 'Total Products',
      '可销售产品': 'Available Products',
      '配件类': 'Accessories',
      '全新设备': 'New Devices',
      '二手设备': 'Used Devices',
      '供应商': 'Suppliers',
      
      // 导航
      '产品管理': 'Products',
      '销售发票': 'Invoices',
      '采购订单': 'Purchase Orders',
      '用户管理': 'Users',
      '库存管理': 'Inventory',
      '入库管理': 'Receiving',
      '销售管理': 'Sales',
      
      // 产品相关
      '产品列表': 'Product List',
      '产品名称': 'Product Name',
      '类别': 'Category',
      '数量': 'Quantity',
      '状态': 'Status',
      '位置': 'Location',
      '进货价': 'Purchase Price',
      '零售价': 'Retail Price',
      '批发价': 'Wholesale Price',
      '税务分类': 'Tax Classification',
      '税额': 'Tax Amount',
      
      // 类别
      '所有类别': 'All Categories',
      '配件': 'Accessory',
      '全新设备': 'New Device',
      '二手设备': 'Used Device',
      
      // 状态
      '所有状态': 'All Status',
      '可销售': 'Available',
      '坏损': 'Damaged',
      '报废': 'Scrapped',
      '已售': 'Sold',
      
      // 其他
      '供应商列表': 'Supplier List',
      '用户列表': 'User List',
      '销售发票列表': 'Invoice List',
      '采购订单列表': 'Purchase Order List'
    };
    
    // 遍历所有文本节点并替换
    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
      null,
      false
    );
    
    let node;
    while (node = walker.nextNode()) {
      const text = node.textContent.trim();
      if (text && textMap[text]) {
        node.textContent = node.textContent.replace(text, textMap[text]);
      }
    }
  },
  
  // 初始化
  init() {
    this.updatePageLanguage();
    
    // 创建语言切换按钮（如果不存在）
    if (!document.getElementById('languageSwitcher')) {
      this.createLanguageSwitcher();
    }
  },
  
  // 创建语言切换按钮
  createLanguageSwitcher() {
    const switcher = document.createElement('div');
    switcher.id = 'languageSwitcher';
    switcher.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 9999;
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
    `;
    
    switcher.innerHTML = `
      <span style="font-size: 18px;">🌐</span>
      <span id="currentLangText">${this.currentLang === 'zh' ? '中文' : 'English'}</span>
    `;
    
    switcher.addEventListener('mouseenter', () => {
      switcher.style.transform = 'scale(1.05)';
      switcher.style.boxShadow = '0 4px 15px rgba(0,0,0,0.15)';
    });
    
    switcher.addEventListener('mouseleave', () => {
      switcher.style.transform = 'scale(1)';
      switcher.style.boxShadow = '0 2px 10px rgba(0,0,0,0.1)';
    });
    
    switcher.addEventListener('click', () => {
      const newLang = this.currentLang === 'zh' ? 'en' : 'zh';
      this.setLanguage(newLang);
      document.getElementById('currentLangText').textContent = newLang === 'zh' ? '中文' : 'English';
    });
    
    document.body.appendChild(switcher);
  }
};

// 页面加载完成后初始化
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => i18n.init());
} else {
  i18n.init();
}
