# Fix Tax Calculation - Exclude Refunded Items ✅

## Date: 2026-02-10

## Issue
Tax calculation in merchant.html "应缴税额" (Tax Due) section was including refunded items, resulting in incorrect tax amounts.

## Solution
Modified `showTaxCalculationDetails()` function to:
1. Check each item against `refundItems` array
2. Skip refunded items in tax calculations
3. Display refund statistics separately
4. Update labels to indicate exclusion of refunds

## Changes Made

### Location
`StockControl-main/public/merchant.html` - Lines 1922-2150

### Key Modifications

#### 1. Item-Level Refund Checking
```javascript
sales.forEach(sale => {
  // Get refunded items for this order
  const refundedItemsInSale = sale.refundItems || [];
  
  sale.items.forEach(item => {
    // Check if THIS ITEM was refunded
    const isItemRefunded = refundedItemsInSale.some(refundItem => {
      if (item.serialNumber && refundItem.serialNumber) {
        return item.serialNumber === refundItem.serialNumber;
      }
      return refundItem.productName === item.productName && 
             refundItem.price === item.price;
    });
    
    // Skip refunded items
    if (isItemRefunded) {
      totalRefundedAmount += itemTotal;
      refundedItemsCount += item.quantity;
      return; // Skip this item
    }
    
    // Only process non-refunded items
    // ... tax calculations ...
  });
});
```

#### 2. Track Refunded Items
```javascript
let totalRefundedAmount = 0;
let refundedItemsCount = 0;
```

#### 3. Updated Summary Labels
```javascript
// Before
<h4>税额汇总</h4>
<div>销售总额</div>

// After
<h4>税额汇总（不含退款）</h4>
<div>有效销售额</div>
```

#### 4. Refund Warning Box
```javascript
${refundedItemsCount > 0 ? `
  <div style="background: #fee2e2; ...">
    <div>⚠️ 已排除退款商品</div>
    <div>退款商品: ${refundedItemsCount} 件 | 退款金额: €${totalRefundedAmount.toFixed(2)}</div>
  </div>
` : ''}
```

#### 5. Added Note in Tax Explanation
```javascript
<li><strong>已退款的商品不计入税额计算</strong></li>
```

## Example: Order 698abab1ea107400f2c00d2c

### Before Fix
```
销售总额: €410.00
应缴税额: €15.89  (includes both items)
  - IPHONE14: €399.00 → Tax: €13.84
  - iPhone Clear Case: €11.00 → Tax: €2.06
```

### After Fix
```
有效销售额: €11.00  (only iPhone Clear Case)
应缴税额: €2.06  (only iPhone Clear Case)

⚠️ 已排除退款商品
退款商品: 1 件 | 退款金额: €399.00
  - IPHONE14: €399.00 (EXCLUDED from tax calculation)
```

## Tax Calculation Logic

### For Each Item
1. **Check if refunded**: Match against `refundItems` array
2. **If refunded**: Skip, add to refund statistics
3. **If not refunded**: Include in tax calculation

### Tax Formulas (Unchanged)
- **VAT 23%**: `amount × 23 / 123`
- **VAT 13.5%**: `amount × 13.5 / 113.5`
- **VAT 9%**: `amount × 9 / 109`
- **Margin VAT**: `(price - cost) × 23 / 123`
- **VAT 0%**: `0`

## Visual Changes

### Summary Section
```
┌─────────────────────────────────────────────────────┐
│ 税额汇总（不含退款）                                │
├──────────────┬──────────────┬──────────────────────┤
│ 有效销售额   │ 应缴税额     │ 净收入               │
│ €11.00       │ €2.06        │ €8.94                │
└──────────────┴──────────────┴──────────────────────┘

┌─────────────────────────────────────────────────────┐
│ ⚠️ 已排除退款商品                                   │
│ 退款商品: 1 件 | 退款金额: €399.00                  │
└─────────────────────────────────────────────────────┘
```

### Tax Breakdown by Classification
Only includes non-refunded items in each category.

## Testing Instructions

### Test 1: View Tax Calculation with Refunds

1. Login as MurrayRanelagh
2. Go to "销售业务" tab
3. Click "应缴税额 📊" card
4. View tax calculation modal

**Expected Results:**
- ✅ Title shows "税额汇总（不含退款）"
- ✅ "有效销售额" instead of "销售总额"
- ✅ Only includes non-refunded items
- ✅ Refund warning box appears (if refunds exist)
- ✅ Shows: "退款商品: X 件 | 退款金额: €XXX.XX"
- ✅ Tax amounts are correct (excluding refunds)

### Test 2: Verify Specific Order

For order 698abab1ea107400f2c00d2c:
- ✅ IPHONE14 (€399.00) excluded from tax calculation
- ✅ iPhone Clear Case (€11.00) included in tax calculation
- ✅ Total tax = €2.06 (only from iPhone Clear Case)
- ✅ Refund warning shows: "退款商品: 1 件 | 退款金额: €399.00"

### Test 3: No Refunds Scenario

If no refunds in period:
- ✅ No refund warning box
- ✅ All items included in calculation
- ✅ Totals match all sales

## Benefits

### For Merchants
1. **Accurate Tax Amounts**: Only pay tax on actual sales
2. **Clear Visibility**: See what's excluded
3. **Correct Reporting**: Tax reports match actual liability

### For Accounting
1. **Tax Compliance**: Correct VAT calculations
2. **Audit Trail**: Clear separation of refunds
3. **Accurate Records**: Tax amounts match revenue

## Related Features

All tax-related features now correctly exclude refunds:

| Feature | Excludes Refunds | Status |
|---------|------------------|--------|
| 应缴税额 (Tax Due Card) | ✅ | Fixed |
| 税额计算过程 (Tax Calculation Details) | ✅ | Fixed |
| 税务报表 (Tax Report) | ✅ | Already correct |
| 销售记录查询 (Sales Records) | ✅ | Already correct |
| 本日销售明细 (Daily Sales Details) | ✅ | Already correct |

## Files Modified

### Frontend
- `StockControl-main/public/merchant.html`
  - Lines 1922-2150: `showTaxCalculationDetails()` function

### Backend
- `StockControl-main/app.js`
  - Lines 6520-6580: Added `refundItems` to API response (already done)

## Status
✅ Tax calculation excludes refunded items
✅ Refund statistics displayed separately
✅ Labels updated to indicate exclusion
✅ Ready for testing

## Next Steps
1. Test tax calculation with refunded orders
2. Verify amounts are correct
3. Confirm refund warning displays
4. Test with no refunds scenario
5. Validate against actual tax liability
