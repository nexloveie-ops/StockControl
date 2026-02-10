const SupplierNew = require('../../models/SupplierNew');
const UserNew = require('../../models/UserNew');

// 获取供应商列表
exports.getSuppliers = async (req, res) => {
  try {
    const suppliers = await SupplierNew.find({ isActive: true })
      .populate('createdBy', 'username', 'UserNew')
      .sort({ createdAt: -1 });
    
    res.json({
      success: true,
      data: suppliers
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// 获取单个供应商
exports.getSupplier = async (req, res) => {
  try {
    const supplier = await SupplierNew.findById(req.params.id)
      .populate('createdBy', 'username', 'UserNew');
    
    if (!supplier) {
      return res.status(404).json({
        success: false,
        error: '供应商未找到'
      });
    }
    
    res.json({
      success: true,
      data: supplier
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// 创建供应商
exports.createSupplier = async (req, res) => {
  try {
    req.body.createdBy = req.user?.id || '000000000000000000000000';
    
    const supplier = new SupplierNew(req.body);
    await supplier.save();
    
    res.status(201).json({
      success: true,
      data: supplier,
      message: '供应商创建成功'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

// 更新供应商
exports.updateSupplier = async (req, res) => {
  try {
    req.body.updatedBy = req.user?.id || '000000000000000000000000';
    
    const supplier = await SupplierNew.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!supplier) {
      return res.status(404).json({
        success: false,
        error: '供应商未找到'
      });
    }
    
    res.json({
      success: true,
      data: supplier,
      message: '供应商更新成功'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

// 删除供应商
exports.deleteSupplier = async (req, res) => {
  try {
    const supplier = await SupplierNew.findById(req.params.id);
    
    if (!supplier) {
      return res.status(404).json({
        success: false,
        error: '供应商未找到'
      });
    }
    
    supplier.isActive = false;
    supplier.updatedBy = req.user?.id || '000000000000000000000000';
    await supplier.save();
    
    res.json({
      success: true,
      message: '供应商删除成功'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// 获取供应商的发票
exports.getSupplierInvoices = async (req, res) => {
  try {
    const PurchaseInvoice = require('../../models/PurchaseInvoice');
    const AdminInventory = require('../../models/AdminInventory');
    const SupplierNew = require('../../models/SupplierNew');
    
    const supplierId = req.params.id;
    
    // 获取供货商信息
    const supplier = await SupplierNew.findById(supplierId);
    if (!supplier) {
      return res.status(404).json({
        success: false,
        error: '供货商不存在'
      });
    }
    
    // 查询PurchaseInvoice表中的发票
    const invoices = await PurchaseInvoice.find({ supplier: supplierId })
      .populate('supplier', 'name code')
      .populate('items.product', 'name sku barcode')
      .sort({ invoiceDate: -1 })
      .lean();
    
    // 查询AdminInventory表中关联到该供货商的产品（按订单号分组）
    const adminInventoryProducts = await AdminInventory.find({ 
      supplier: supplier.name 
    }).lean();
    
    // 按订单号分组AdminInventory产品
    const inventoryByInvoice = {};
    adminInventoryProducts.forEach(product => {
      const invoiceNum = product.invoiceNumber || 'N/A';
      if (!inventoryByInvoice[invoiceNum]) {
        inventoryByInvoice[invoiceNum] = [];
      }
      inventoryByInvoice[invoiceNum].push(product);
    });
    
    // 合并PurchaseInvoice和AdminInventory数据
    const invoicesWithTaxIncluded = invoices.map(invoice => {
      // 处理PurchaseInvoice中的items
      const itemsWithTaxIncluded = invoice.items.map(item => {
        const taxMultiplier = item.vatRate === 'VAT 23%' ? 1.23 : 
                             item.vatRate === 'VAT 13.5%' ? 1.135 : 1.0;
        
        // 对于VAT 0%（Margin VAT），价格已经是最终价格，不含税
        const totalCostIncludingTax = item.totalCost;
        const totalCostExcludingTax = item.vatRate === 'VAT 0%' ? item.totalCost : item.totalCost / taxMultiplier;
        const taxAmount = totalCostIncludingTax - totalCostExcludingTax;
        
        return {
          ...item,
          unitCostIncludingTax: item.unitCost,
          totalCostIncludingTax: totalCostIncludingTax,
          totalCostExcludingTax: totalCostExcludingTax,
          taxAmount: taxAmount,
          source: 'PurchaseInvoice'
        };
      });
      
      // 添加AdminInventory中的产品
      const adminItems = inventoryByInvoice[invoice.invoiceNumber] || [];
      const adminItemsFormatted = adminItems.map(product => {
        // 计算税额
        let taxMultiplier = 1.0;
        if (product.taxClassification === 'VAT_23' || product.taxClassification === 'VAT 23%') {
          taxMultiplier = 1.23;
        } else if (product.taxClassification === 'VAT_13_5' || product.taxClassification === 'VAT 13.5%') {
          taxMultiplier = 1.135;
        }
        
        const totalCostIncludingTax = product.costPrice * product.quantity;
        const totalCostExcludingTax = totalCostIncludingTax / taxMultiplier;
        const taxAmount = totalCostIncludingTax - totalCostExcludingTax;
        
        return {
          _id: product._id,
          productName: `${product.productName} - ${product.model} - ${product.color}`,
          product: {
            name: product.productName,
            sku: product.model,
            barcode: product.barcode || ''
          },
          quantity: product.quantity,
          unitCost: product.costPrice,
          totalCost: totalCostIncludingTax,
          totalCostExcludingTax: totalCostExcludingTax,
          taxAmount: taxAmount,
          vatRate: product.taxClassification === 'VAT_23' ? 'VAT 23%' : 
                   product.taxClassification === 'VAT_13_5' ? 'VAT 13.5%' : 'VAT 0%',
          unitCostIncludingTax: product.costPrice,
          totalCostIncludingTax: totalCostIncludingTax,
          location: product.location,
          condition: product.condition,
          source: 'AdminInventory'
        };
      });
      
      // 合并所有items
      const allItems = [...itemsWithTaxIncluded, ...adminItemsFormatted];
      
      // 重新计算总金额、小计和税额
      const totalAmount = allItems.reduce((sum, item) => sum + (item.totalCostIncludingTax || item.totalCost), 0);
      const subtotal = allItems.reduce((sum, item) => sum + (item.totalCostExcludingTax || item.totalCost), 0);
      const taxAmount = totalAmount - subtotal;
      
      return {
        _id: invoice._id,
        invoiceNumber: invoice.invoiceNumber,
        supplier: invoice.supplier,
        invoiceDate: invoice.invoiceDate,
        dueDate: invoice.dueDate,
        currency: invoice.currency,
        paymentStatus: invoice.paymentStatus,
        paidAmount: invoice.paidAmount,
        status: invoice.status,
        receivingStatus: invoice.receivingStatus,
        notes: invoice.notes,
        payments: invoice.payments || [],
        attachments: invoice.attachments || [],
        createdAt: invoice.createdAt,
        updatedAt: invoice.updatedAt,
        items: allItems,
        totalAmount: totalAmount,
        subtotal: subtotal,
        taxAmount: taxAmount,
        adminInventoryCount: adminItems.length,
        purchaseInvoiceCount: itemsWithTaxIncluded.length
      };
    });
    
    // 添加只在AdminInventory中存在的订单（没有对应的PurchaseInvoice）
    const existingInvoiceNumbers = new Set(invoices.map(inv => inv.invoiceNumber));
    const additionalInvoices = [];
    
    Object.keys(inventoryByInvoice).forEach(invoiceNum => {
      if (invoiceNum !== 'N/A' && !existingInvoiceNumbers.has(invoiceNum)) {
        const products = inventoryByInvoice[invoiceNum];
        
        // 计算每个产品的税额
        const formattedProducts = products.map(product => {
          let taxMultiplier = 1.0;
          if (product.taxClassification === 'VAT_23' || product.taxClassification === 'VAT 23%') {
            taxMultiplier = 1.23;
          } else if (product.taxClassification === 'VAT_13_5' || product.taxClassification === 'VAT 13.5%') {
            taxMultiplier = 1.135;
          }
          
          const totalCostIncludingTax = product.costPrice * product.quantity;
          const totalCostExcludingTax = totalCostIncludingTax / taxMultiplier;
          const taxAmount = totalCostIncludingTax - totalCostExcludingTax;
          
          return {
            _id: product._id,
            productName: `${product.productName} - ${product.model} - ${product.color}`,
            product: {
              name: product.productName,
              sku: product.model,
              barcode: product.barcode || ''
            },
            quantity: product.quantity,
            unitCost: product.costPrice,
            totalCost: totalCostIncludingTax,
            totalCostExcludingTax: totalCostExcludingTax,
            taxAmount: taxAmount,
            vatRate: product.taxClassification === 'VAT_23' ? 'VAT 23%' : 
                     product.taxClassification === 'VAT_13_5' ? 'VAT 13.5%' : 'VAT 0%',
            unitCostIncludingTax: product.costPrice,
            totalCostIncludingTax: totalCostIncludingTax,
            location: product.location,
            condition: product.condition,
            source: 'AdminInventory'
          };
        });
        
        // 计算总金额、小计和税额
        const totalAmount = formattedProducts.reduce((sum, p) => sum + p.totalCostIncludingTax, 0);
        const subtotal = formattedProducts.reduce((sum, p) => sum + p.totalCostExcludingTax, 0);
        const taxAmount = totalAmount - subtotal;
        
        additionalInvoices.push({
          _id: `admin-${invoiceNum}`,
          invoiceNumber: invoiceNum,
          supplier: {
            _id: supplierId,
            name: supplier.name,
            code: supplier.code
          },
          invoiceDate: products[0].createdAt,
          status: 'received',
          paymentStatus: 'pending',
          totalAmount: totalAmount,
          subtotal: subtotal,
          taxAmount: taxAmount,
          paidAmount: 0,
          items: formattedProducts,
          adminInventoryCount: products.length,
          purchaseInvoiceCount: 0,
          sourceType: 'AdminInventory-Only'
        });
      }
    });
    
    res.json({
      success: true,
      data: [...invoicesWithTaxIncluded, ...additionalInvoices].sort((a, b) => 
        new Date(b.invoiceDate) - new Date(a.invoiceDate)
      )
    });
  } catch (error) {
    console.error('获取供货商发票失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};