const ProductNew = require('../../models/ProductNew');
const ProductCategory = require('../../models/ProductCategory');
const SupplierNew = require('../../models/SupplierNew');
const UserNew = require('../../models/UserNew');
const Store = require('../../models/Store');
const StoreInventory = require('../../models/StoreInventory');

// 获取仪表板统计数据
exports.getDashboardStats = async (req, res) => {
  try {
    const stats = await Promise.all([
      // 产品统计
      ProductNew.countDocuments({ isActive: true }),
      ProductNew.countDocuments({ isActive: true, stockQuantity: { $gt: 0 } }),
      
      // 分类统计
      ProductCategory.countDocuments({ isActive: true }),
      
      // 供应商统计
      SupplierNew.countDocuments({ isActive: true }),
      
      // 用户统计
      UserNew.countDocuments({ isActive: true }),
      
      // 店面统计
      Store.countDocuments({ isActive: true }),
      
      // 库存价值统计
      ProductNew.aggregate([
        { $match: { isActive: true } },
        {
          $group: {
            _id: null,
            totalCostValue: { $sum: { $multiply: ['$costPrice', '$stockQuantity'] } },
            totalRetailValue: { $sum: { $multiply: ['$retailPrice', '$stockQuantity'] } }
          }
        }
      ])
    ]);

    const [
      totalProducts,
      inStockProducts,
      totalCategories,
      totalSuppliers,
      totalUsers,
      totalStores,
      inventoryValue
    ] = stats;

    const valueStats = inventoryValue[0] || { totalCostValue: 0, totalRetailValue: 0 };

    res.json({
      success: true,
      data: {
        products: {
          total: totalProducts,
          inStock: inStockProducts,
          outOfStock: totalProducts - inStockProducts
        },
        categories: totalCategories,
        suppliers: totalSuppliers,
        users: totalUsers,
        stores: totalStores,
        inventory: {
          totalCostValue: valueStats.totalCostValue,
          totalRetailValue: valueStats.totalRetailValue,
          potentialProfit: valueStats.totalRetailValue - valueStats.totalCostValue
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

// 获取产品统计
exports.getProductStats = async (req, res) => {
  try {
    const stats = await Promise.all([
      // 按分类统计
      ProductNew.aggregate([
        { $match: { isActive: true } },
        {
          $lookup: {
            from: 'productcategories',
            localField: 'category',
            foreignField: '_id',
            as: 'categoryInfo'
          }
        },
        { $unwind: '$categoryInfo' },
        {
          $group: {
            _id: '$categoryInfo.name',
            count: { $sum: 1 },
            totalStock: { $sum: '$stockQuantity' },
            totalValue: { $sum: { $multiply: ['$retailPrice', '$stockQuantity'] } }
          }
        },
        { $sort: { count: -1 } }
      ]),
      
      // 按成色统计
      ProductNew.aggregate([
        { $match: { isActive: true } },
        {
          $group: {
            _id: '$condition',
            count: { $sum: 1 },
            totalStock: { $sum: '$stockQuantity' }
          }
        }
      ]),
      
      // 按税务分类统计
      ProductNew.aggregate([
        { $match: { isActive: true } },
        {
          $group: {
            _id: '$vatRate',
            count: { $sum: 1 },
            totalValue: { $sum: { $multiply: ['$retailPrice', '$stockQuantity'] } }
          }
        }
      ])
    ]);

    const [categoryStats, conditionStats, vatStats] = stats;

    res.json({
      success: true,
      data: {
        byCategory: categoryStats,
        byCondition: conditionStats,
        byVatRate: vatStats
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// 获取库存统计
exports.getInventoryStats = async (req, res) => {
  try {
    const stats = await Promise.all([
      // 低库存商品
      ProductNew.countDocuments({
        isActive: true,
        $expr: { $lte: ['$stockQuantity', '$minStockLevel'] }
      }),
      
      // 零库存商品
      ProductNew.countDocuments({
        isActive: true,
        stockQuantity: 0
      }),
      
      // 按店面统计库存
      StoreInventory.aggregate([
        {
          $lookup: {
            from: 'stores',
            localField: 'store',
            foreignField: '_id',
            as: 'storeInfo'
          }
        },
        { $unwind: '$storeInfo' },
        {
          $group: {
            _id: '$storeInfo.name',
            totalItems: { $sum: 1 },
            totalStock: { $sum: '$currentStock' },
            totalValue: { $sum: '$totalValue' }
          }
        },
        { $sort: { totalValue: -1 } }
      ])
    ]);

    const [lowStockCount, zeroStockCount, storeStats] = stats;

    res.json({
      success: true,
      data: {
        lowStock: lowStockCount,
        zeroStock: zeroStockCount,
        byStore: storeStats
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// 获取供应商统计
exports.getSupplierStats = async (req, res) => {
  try {
    const stats = await Promise.all([
      // 按供应商统计产品数量
      ProductNew.aggregate([
        { $match: { isActive: true } },
        {
          $lookup: {
            from: 'suppliernews',
            localField: 'supplier',
            foreignField: '_id',
            as: 'supplierInfo'
          }
        },
        { $unwind: { path: '$supplierInfo', preserveNullAndEmptyArrays: true } },
        {
          $group: {
            _id: '$supplierInfo.name',
            productCount: { $sum: 1 },
            totalValue: { $sum: { $multiply: ['$costPrice', '$stockQuantity'] } }
          }
        },
        { $sort: { productCount: -1 } }
      ]),
      
      // 供应商评级统计
      SupplierNew.aggregate([
        { $match: { isActive: true } },
        {
          $group: {
            _id: null,
            avgQuality: { $avg: '$rating.quality' },
            avgDelivery: { $avg: '$rating.delivery' },
            avgPricing: { $avg: '$rating.pricing' },
            avgService: { $avg: '$rating.service' }
          }
        }
      ])
    ]);

    const [supplierProductStats, ratingStats] = stats;
    const avgRatings = ratingStats[0] || {
      avgQuality: 0,
      avgDelivery: 0,
      avgPricing: 0,
      avgService: 0
    };

    res.json({
      success: true,
      data: {
        bySupplier: supplierProductStats,
        averageRatings: avgRatings
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};