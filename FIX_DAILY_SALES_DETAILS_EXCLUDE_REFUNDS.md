# Fix Daily Sales Details - Exclude Refunds ✅

## Date: 2026-02-10

## Issues Fixed

### Issue 1: Daily Sales Details Included Refunded Items
**Problem:** When clicking "本日销售" (Today's Sales) to view details, the modal showed all sales including refunded ones, causing incorrect totals.

**Solution:** Filter out refunded sales before calculating totals and displaying details.

### Issue 2: Sales Records Query - Refunded Items Not Marked
**Problem:** In "销售记录查询" (Sales Records Query), refunded items were not visually marked.

**Solution:** Already implemented in previous update - refunded items show with red background, strike-through text, and "已退款" badge.

## Changes Made

### 1. Daily Sales Details Modal (`showDailySalesDetails()`)

**Location:** `StockControl-main/public/merchant.html` lines 1617-1750

**Key Changes:**

#### Filter Refunded Sales
```javascript
// 过滤掉已退款的销售记录
const sales = result.data.filter(sale => sale.status !== 'REFUNDED');
const refundedSales = result.data.filter(sale => sale.status === 'REFUNDED');
```

#### Updated Display Labels
- "销售笔数" → "有效销售笔数" (Effective Sales Count)
- "销售总额" → "有效销售额" (Effective Sales Amount)
- Added refund count indicator: "已退款: X 笔"

#### Updated Totals
- Changed "合计：" → "合计（不含退款）：" (Total excluding refunds)
- Only calculates totals from non-refunded sales

#### Added Refund Warning Box
When refunded sales exist, displays:
```
⚠️ 今日退款记录
已退款订单: X 笔 | 退款金额: €XXX.XX
```

#### Handle All-Refunded Scenario
If all sales are refunded:
```
今日暂无有效销售记录（所有销售已退款）
```

### 2. Sales Records Query Display

**Status:** Already implemented in previous update

**Features:**
- ✅ Red background for refunded items
- ✅ Strike-through text
- ✅ "已退款" badge
- ✅ Separate totals for active and refunded items
- ✅ Refund statistics box

## Before vs After

### Before (Daily Sales Details)
```
销售笔数: 10
销售总额: €5,000
合计: €5,000

(Included 2 refunded sales worth €600)
```

### After (Daily Sales Details)
```
有效销售笔数: 8
已退款: 2 笔
有效销售额: €4,400
合计（不含退款）: €4,400

⚠️ 今日退款记录
已退款订单: 2 笔 | 退款金额: €600.00
```

## Visual Design

### Daily Sales Details Modal

#### Summary Section
```
┌─────────────────────────────────────────────────┐
│ 销售汇总                                        │
├─────────────────┬─────────────────┬─────────────┤
│ 有效销售笔数    │ 有效销售额      │ 利润        │
│ 8               │ €4,400.00       │ €800.00     │
│ 已退款: 2 笔    │                 │             │
└─────────────────┴─────────────────┴─────────────┘
```

#### Sales Table
```
┌──────┬──────────┬────┬─────────┬────────┬──────────┐
│ 时间 │ 产品     │ 数量│ 金额    │ 税额   │ 支付方式 │
├──────┼──────────┼────┼─────────┼────────┼──────────┤
│ 10:30│ iPhone   │ 1  │ €500.00 │ €93.50 │ 💵 现金  │
│ 14:20│ Samsung  │ 1  │ €400.00 │ €74.80 │ 💳 刷卡  │
├──────┴──────────┴────┼─────────┼────────┴──────────┤
│ 合计（不含退款）：   │ €900.00 │ €168.30           │
└──────────────────────┴─────────┴───────────────────┘
```

#### Refund Warning (if applicable)
```
┌─────────────────────────────────────────────────┐
│ ⚠️ 今日退款记录                                 │
│ 已退款订单: 2 笔 | 退款金额: €600.00           │
└─────────────────────────────────────────────────┘
```

### Sales Records Query

Already implemented with red marking:
```
┌────────┬──────┬─────────┬────┬─────┬────────┐
│ 状态   │ 日期 │ 产品    │ 数量│ 单价│ 销售额 │
├────────┼──────┼─────────┼────┼─────┼────────┤
│ 正常   │ 2/10 │ iPhone  │ 1  │ €500│ €500   │ ← White background
│ 已退款 │ 2/9  │ Samsung │ 1  │ €300│ €300   │ ← Red background, strike-through
└────────┴──────┴─────────┴────┴─────┴────────┘
```

## Data Flow

```
┌──────────────────┐
│  API Response    │
│  All Sales Data  │
│  (with status)   │
└────────┬─────────┘
         │
         ▼
┌──────────────────────────────────┐
│  Filter by Status                │
│                                  │
│  sales = data.filter(            │
│    sale => sale.status !== 'REFUNDED'│
│  )                               │
│                                  │
│  refundedSales = data.filter(    │
│    sale => sale.status === 'REFUNDED'│
│  )                               │
└────────┬─────────────────────────┘
         │
         ├──────────────────┬──────────────────┐
         ▼                  ▼                  ▼
┌─────────────────┐ ┌──────────────┐ ┌─────────────────┐
│  Display Active │ │  Calculate   │ │  Show Refund    │
│  Sales Only     │ │  Totals from │ │  Warning (if    │
│                 │ │  Active Only │ │  applicable)    │
└─────────────────┘ └──────────────┘ └─────────────────┘
```

## Testing Instructions

### Test 1: Daily Sales Details with Mixed Status

**Setup:**
1. Create 3 normal sales today
2. Create 1 sale and refund it

**Steps:**
1. Login as merchant
2. Go to "销售业务" tab
3. Click "本日销售" card to open details modal

**Expected Results:**
- ✅ Shows "有效销售笔数: 3"
- ✅ Shows "已退款: 1 笔"
- ✅ Table shows only 3 active sales
- ✅ Totals exclude refunded amount
- ✅ Refund warning box appears at bottom
- ✅ Warning shows: "已退款订单: 1 笔 | 退款金额: €XXX.XX"

### Test 2: Daily Sales Details - All Refunded

**Setup:**
1. Create 2 sales today
2. Refund both sales

**Steps:**
1. Login as merchant
2. Go to "销售业务" tab
3. Click "本日销售" card

**Expected Results:**
- ✅ Shows message: "今日暂无有效销售记录（所有销售已退款）"
- ✅ No sales table displayed

### Test 3: Daily Sales Details - No Refunds

**Setup:**
1. Create 5 normal sales today
2. No refunds

**Steps:**
1. Login as merchant
2. Go to "销售业务" tab
3. Click "本日销售" card

**Expected Results:**
- ✅ Shows "有效销售笔数: 5"
- ✅ No refund count indicator
- ✅ Table shows all 5 sales
- ✅ Totals are correct
- ✅ No refund warning box

### Test 4: Sales Records Query - Red Marking

**Setup:**
1. Create sales with mixed status over date range

**Steps:**
1. Go to "销售业务" tab
2. Scroll to "销售记录查询"
3. Select date range
4. Click "查询销售记录"

**Expected Results:**
- ✅ Refunded items have red background (#fee2e2)
- ✅ Refunded items have strike-through text
- ✅ Refunded items show "已退款" badge
- ✅ Normal items have white background
- ✅ Normal items show "正常" badge
- ✅ Totals row shows "合计（不含退款）"
- ✅ Separate "已退款金额" row (if refunds exist)
- ✅ Summary shows breakdown: "正常: X | 已退款: Y"

## Consistency Across Features

All sales-related features now correctly handle refunds:

| Feature | Excludes Refunds | Shows Refund Status |
|---------|------------------|---------------------|
| 本日销售 (Dashboard Card) | ✅ | N/A |
| 本日销售明细 (Details Modal) | ✅ | ✅ (Warning Box) |
| 销售记录查询 (Sales Query) | ✅ (in totals) | ✅ (Red Marking) |
| 税务报表 (Tax Report) | ✅ | N/A |

## Files Modified

### Frontend Only
- `StockControl-main/public/merchant.html`
  - Lines 1617-1750: `showDailySalesDetails()` function
  - Lines 3544-3750: `displaySalesRecords()` function (already done)

### Backend (No Changes)
- APIs already return status field correctly
- Tax report API already filters refunds

## Benefits

### For Merchants
1. **Accurate Daily View**: Dashboard shows real revenue
2. **Clear History**: Can see what was refunded
3. **Correct Totals**: All calculations exclude refunds
4. **Transparency**: Refund information still accessible

### For Accounting
1. **Correct Reports**: Tax calculations exclude refunds
2. **Audit Trail**: Refunded transactions remain visible
3. **Reconciliation**: Easy to match with bank statements
4. **Compliance**: Proper handling of refunded VAT

## Status
✅ Daily sales details exclude refunds
✅ Refund warning box added
✅ Sales records query shows red marking
✅ All totals accurate
✅ Ready for testing

## Next Steps
1. Test with real refunded sales data
2. Verify all calculations are correct
3. Confirm visual indicators display properly
4. Test edge cases (all refunded, no refunds, etc.)
