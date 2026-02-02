const StoreInventory = require('../../models/StoreInventory');
const ProductNew = require('../../models/ProductNew');
const Store = require('../../models/Store');

// 获取库存概览
exports.getInventoryOverview = async (req, res) => {
  try {
    const overview = await StoreInventory.aggregate([
      {
        $group: {
          _id: null,
          totalProducts: { $sum: 1 },
          totalStock: { $sum: '$currentStock' },
          totalValue: { $sum: '$totalValue' },
          lowStockItems: {
            $sum: {
              $cond: [
                { $lte: ['$currentStock', '$minStockLevel'] },
                1,
                0
              ]
            }
          }
        }
      }
    ]);

    const result = overview[0] || {
      totalProducts: 0,
      totalStock: 0,
      totalValue: 0,
      lowStockItems: 0
    };

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// 获取低库存商品
exports.getLowStockItems = async (req, res) => {
  try {
    const lowStockItems = await StoreInventory.find({
      $expr: { $lte: ['$currentStock', '$minStockLevel'] }
    })
    .populate('product', 'name sku brand model')
    .populate('store', 'name code')
    .sort({ currentStock: 1 });

    res.json({
      success: true,
      data: lowStockItems
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// 获取指定店面的库存
exports.getStoreInventory = async (req, res) => {
  try {
    const { storeId } = req.params;
    const { page = 1, limit = 20, search } = req.query;

    let query = { store: storeId };

    if (search) {
      const products = await ProductNew.find({
        $or: [
          { name: new RegExp(search, 'i') },
          { sku: new RegExp(search, 'i') },
          { brand: new RegExp(search, 'i') }
        ]
      }).select('_id');

      query.product = { $in: products.map(p => p._id) };
    }

    const inventory = await StoreInventory.find(query)
      .populate('product', 'name sku brand model condition vatRate')
      .populate('store', 'name code')
      .sort({ 'product.name': 1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await StoreInventory.countDocuments(query);

    res.json({
      success: true,
      data: {
        inventory,
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(total / limit),
          total
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// 调整库存
exports.adjustInventory = async (req, res) => {
  try {
    const { inventoryId, newQuantity, reason } = req.body;

    const inventory = await StoreInventory.findById(inventoryId);
    
    if (!inventory) {
      return res.status(404).json({
        success: false,
        error: '库存记录未找到'
      });
    }

    const oldQuantity = inventory.currentStock;
    const difference = inventory.adjustStock(newQuantity, reason, `ADJ-${Date.now()}`);
    
    await inventory.save();

    res.json({
      success: true,
      data: {
        inventory,
        adjustment: {
          oldQuantity,
          newQuantity,
          difference,
          reason
        }
      },
      message: '库存调整成功'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

// 店面间库存调拨
exports.transferInventory = async (req, res) => {
  try {
    const { fromStoreId, toStoreId, productId, quantity, reason } = req.body;

    // 查找源店面库存
    const fromInventory = await StoreInventory.findOne({
      store: fromStoreId,
      product: productId
    });

    if (!fromInventory) {
      return res.status(404).json({
        success: false,
        error: '源店面没有此产品库存'
      });
    }

    if (fromInventory.availableStock < quantity) {
      return res.status(400).json({
        success: false,
        error: `源店面可用库存不足，可用: ${fromInventory.availableStock}`
      });
    }

    // 查找或创建目标店面库存
    let toInventory = await StoreInventory.findOne({
      store: toStoreId,
      product: productId
    });

    if (!toInventory) {
      const product = await ProductNew.findById(productId);
      const store = await Store.findById(toStoreId);
      
      toInventory = new StoreInventory({
        product: productId,
        store: toStoreId,
        currentStock: 0,
        averageCost: product.costPrice,
        minStockLevel: product.minStockLevel
      });
    }

    // 执行调拨
    const transferRef = `TRF-${Date.now()}`;
    
    fromInventory.adjustStock(
      fromInventory.currentStock - quantity,
      reason || '库存调拨出库',
      transferRef
    );
    
    toInventory.adjustStock(
      toInventory.currentStock + quantity,
      reason || '库存调拨入库',
      transferRef
    );

    await fromInventory.save();
    await toInventory.save();

    res.json({
      success: true,
      data: {
        fromInventory,
        toInventory,
        transfer: {
          quantity,
          reason,
          reference: transferRef
        }
      },
      message: '库存调拨成功'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};