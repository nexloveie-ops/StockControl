# Item-Level Refund Display - Complete ✅

## Date: 2026-02-10

## Issue Identified

### Problem
Order `698abab1ea107400f2c00d2c` contains:
- **Item 1**: IPHONE14 (€399.00) - **REFUNDED** ✅
- **Item 2**: iPhone Clear Case (€11.00) - **NOT REFUNDED** ❌

**Previous Implementation:**
- Marked entire order as refunded (order-level)
- Both items showed red background
- Incorrect: iPhone Clear Case was NOT refunded

**Correct Behavior:**
- Only IPHONE14 should show as refunded
- iPhone Clear Case should show as normal
- Display should be at **item-level**, not order-level

## Solution

Changed from **order-level** to **item-level** refund status checking.

### Logic Flow

```
For each sale order:
  ├─ Get refundItems array from order
  │
  └─ For each item in order.items:
       ├─ Check if item exists in refundItems
       │  ├─ Match by serialNumber (if available)
       │  └─ Or match by productName + price
       │
       └─ Set itemRefunded flag
          ├─ true → Show red background + "已退款"
          └─ false → Show white background + "正常"
```

## Implementation

### Key Changes in `displaySalesRecords()`

**Location:** `StockControl-main/public/merchant.html` lines 3560-3750

#### 1. Check Each Item Against refundItems

```javascript
salesData.forEach(sale => {
  // Get refunded items for this order
  const refundedItemsInSale = sale.refundItems || [];
  
  sale.items.forEach(item => {
    // Check if THIS ITEM was refunded
    const isItemRefunded = refundedItemsInSale.some(refundItem => {
      // Match by serial number (preferred)
      if (item.serialNumber && refundItem.serialNumber) {
        return item.serialNumber === refundItem.serialNumber;
      }
      // Or match by product name + price
      return refundItem.productName === item.productName && 
             refundItem.price === item.price;
    });
    
    allItems.push({
      ...item,
      itemRefunded: isItemRefunded  // Item-level flag
    });
  });
});
```

#### 2. Filter by Item Status

```javascript
// Before: Order-level filtering
const activeItems = allItems.filter(item => 
  item.status !== 'REFUNDED'
);

// After: Item-level filtering
const activeItems = allItems.filter(item => 
  !item.itemRefunded
);
```

#### 3. Display Based on Item Status

```javascript
// Before: Check order status
const isRefunded = item.status === 'REFUNDED';

// After: Check item refund flag
const isRefunded = item.itemRefunded;
```

## Example: Order 698abab1ea107400f2c00d2c

### Order Details
- **Order ID**: 698abab1ea107400f2c00d2c
- **Merchant**: MurrayRanelagh
- **Order Status**: `refunded`
- **Total Amount**: €410.00
- **Refund Amount**: €399.00

### Items Breakdown

| Item | Price | Serial Number | Refunded? | Display |
|------|-------|---------------|-----------|---------|
| IPHONE14 | €399.00 | 351952298904928 | ✅ YES | 🔴 Red + Strike-through |
| iPhone Clear Case | €11.00 | N/A | ❌ NO | ⚪ White + Normal |

### Matching Logic

**IPHONE14:**
```javascript
refundItems.some(r => r.serialNumber === '351952298904928')
// Returns: true ✅
// Display: Red background, "已退款" badge
```

**iPhone Clear Case:**
```javascript
refundItems.some(r => 
  r.productName === 'iPhone Clear Case (iPhone 14 - Clear)' &&
  r.price === 11
)
// Returns: false ❌
// Display: White background, "正常" badge
```

## Visual Display

### Before (Order-Level)
```
┌────────┬──────────────────────────────────┬────────┐
│ 状态   │ 产品                             │ 价格   │
├────────┼──────────────────────────────────┼────────┤
│ 已退款 │ IPHONE14                         │ €399   │ ← Red (Correct)
│ 已退款 │ iPhone Clear Case                │ €11    │ ← Red (WRONG!)
└────────┴──────────────────────────────────┴────────┘
```

### After (Item-Level)
```
┌────────┬──────────────────────────────────┬────────┐
│ 状态   │ 产品                             │ 价格   │
├────────┼──────────────────────────────────┼────────┤
│ 已退款 │ IPHONE14                         │ €399   │ ← Red (Correct)
│ 正常   │ iPhone Clear Case                │ €11    │ ← White (Correct!)
└────────┴──────────────────────────────────┴────────┘
```

## Statistics Update

### Summary Section Changes

**Before:**
```
销售记录数: 1
正常: 0 | 已退款: 1
```

**After:**
```
销售订单数: 1
商品: 2 件
有效商品数: 1 (iPhone Clear Case)
已退款商品: 1 件 (IPHONE14)
```

### Totals Calculation

**Active Items Total:**
```javascript
// Only includes iPhone Clear Case
activeItems.reduce((sum, item) => sum + item.price, 0)
// = €11.00 ✅
```

**Refunded Items Total:**
```javascript
// Only includes IPHONE14
refundedItems.reduce((sum, item) => sum + item.price, 0)
// = €399.00 ✅
```

## Matching Strategies

### 1. Serial Number Match (Preferred)
```javascript
if (item.serialNumber && refundItem.serialNumber) {
  return item.serialNumber === refundItem.serialNumber;
}
```
- Most accurate
- Used for devices with unique serial numbers
- Example: IPHONE14 matched by "351952298904928"

### 2. Product Name + Price Match (Fallback)
```javascript
return refundItem.productName === item.productName && 
       refundItem.price === item.price;
```
- Used when no serial number
- Works for accessories and services
- Example: iPhone Clear Case matched by name + €11.00

## Edge Cases Handled

### 1. Partial Refund
- ✅ Order has multiple items
- ✅ Only some items refunded
- ✅ Each item displays correct status

### 2. Full Refund
- ✅ All items in refundItems
- ✅ All items show as refunded
- ✅ Active totals = €0.00

### 3. No Refund
- ✅ refundItems array empty or missing
- ✅ All items show as normal
- ✅ No refund warning box

### 4. Multiple Quantities
- ✅ If item.quantity > 1
- ✅ Entire quantity marked as refunded
- ✅ Partial quantity refunds not supported (system limitation)

## Testing Instructions

### Test 1: Verify Order 698abab1ea107400f2c00d2c

1. Login as MurrayRanelagh
2. Go to "销售业务" → "销售记录查询"
3. Select date: 2026-02-10
4. Click "查询销售记录"

**Expected Results:**
- ✅ IPHONE14: Red background, "已退款" badge, strike-through
- ✅ iPhone Clear Case: White background, "正常" badge, no strike-through
- ✅ Active total: €11.00
- ✅ Refunded total: €399.00
- ✅ Summary shows: "有效商品数: 1"
- ✅ Refund warning: "已退款商品: 1 件 | 退款金额: €399.00"

### Test 2: Run Verification Script

```bash
node verify-item-level-refund.js
```

**Expected Output:**
```
商品 1: IPHONE14
  退款状态: ❌ 已退款

商品 2: iPhone Clear Case (iPhone 14 - Clear)
  退款状态: ✅ 正常

预期显示效果:
IPHONE14: 🔴 红色背景 + 删除线 + "已退款"徽章
iPhone Clear Case: ⚪ 白色背景 + "正常"徽章
```

## Benefits

### For Merchants
1. **Accurate Display**: Only refunded items marked
2. **Clear Status**: Can see which items were refunded
3. **Correct Totals**: Active sales exclude only refunded items
4. **Partial Refunds**: Properly handled

### For Accounting
1. **Item-Level Tracking**: Know exactly what was refunded
2. **Accurate Revenue**: Only count non-refunded items
3. **Tax Compliance**: Correct tax calculations
4. **Audit Trail**: Clear refund history per item

## Data Structure

### MerchantSale Schema
```javascript
{
  _id: ObjectId,
  status: "refunded",  // Order-level status
  items: [
    {
      productName: "IPHONE14",
      price: 399,
      serialNumber: "351952298904928"
    },
    {
      productName: "iPhone Clear Case",
      price: 11,
      serialNumber: null
    }
  ],
  refundItems: [  // Only refunded items
    {
      productName: "IPHONE14",
      price: 399,
      serialNumber: "351952298904928",
      totalAmount: 399
    }
  ],
  refundAmount: 399
}
```

## Files Modified

### Frontend
- `StockControl-main/public/merchant.html`
  - Lines 3560-3750: `displaySalesRecords()` function
  - Changed from order-level to item-level refund checking

### Utility Scripts
- `StockControl-main/verify-item-level-refund.js` (new)
  - Verification script for item-level refund logic

## Status
✅ Item-level refund detection implemented
✅ Display logic updated
✅ Statistics corrected
✅ Verification script created
✅ Ready for testing

## Next Steps
1. Test with order 698abab1ea107400f2c00d2c
2. Verify IPHONE14 shows as refunded
3. Verify iPhone Clear Case shows as normal
4. Confirm totals are correct
5. Test with other partial refund orders
