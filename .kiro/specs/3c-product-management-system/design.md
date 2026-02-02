# 设计文档：3C产品管理系统

## 概述

3C产品管理系统是一个综合性的库存和销售管理解决方案，专为经营计算机、通信和消费电子产品的企业设计。该系统支持批发和零售业务，具有基于角色的访问控制、分级定价、税务管理以及完整的采购到销售工作流程跟踪。

架构采用分层方法，在数据模型、业务逻辑和用户界面之间实现清晰分离。系统处理两种不同的产品类型（配件和设备），采用不同的库存跟踪机制，支持多种税务分类，并提供全面的报表功能。

## 架构

### 系统层次

1. **数据层**：管理产品、用户、发票和交易的持久化存储
2. **业务逻辑层**：实现定价规则、税务计算、库存管理和工作流状态机
3. **API层**：为所有系统操作提供RESTful端点
4. **认证与授权层**：处理用户认证和基于角色的访问控制
5. **表示层**：不同角色的用户界面（基于Web）

### 关键架构决策

- **分离产品类型**：配件和设备采用不同建模，以反映其不同的库存跟踪需求
- **灵活的税务系统**：税务分类是每个产品的属性，允许混合税务处理
- **订单状态机**：采购订单遵循严格的状态进展以确保数据完整性
- **审计跟踪**：所有价格变更、状态更新和关键操作都被记录以符合合规要求
- **基于角色的访问控制（RBAC）**：权限在API层根据用户角色强制执行

### 技术考虑

- 数据库：关系型数据库（PostgreSQL/MySQL）以实现ACID合规性和复杂查询
- 后端：RESTful API架构
- 认证：基于JWT的认证，带有角色声明
- 前端：支持桌面和平板设备的响应式Web应用程序

## 组件和接口

### 1. 用户管理组件

**职责：**
- 用户认证和会话管理
- 角色分配和权限检查
- 用户配置文件管理

**接口：**

```typescript
interface UserManagement {
  authenticate(username: string, password: string): AuthToken
  validateToken(token: AuthToken): User
  checkPermission(user: User, permission: Permission): boolean
  getUsersByRole(role: UserRole): User[]
}

interface User {
  id: string
  username: string
  role: UserRole
  merchantTier?: MerchantTier  // 仅批发商户
  discountRange?: DiscountRange  // 仅仓管员
  createdAt: timestamp
  lastLogin: timestamp
}

enum UserRole {
  RETAIL_CUSTOMER,      // 零售客户
  WHOLESALE_MERCHANT,   // 批发商户
  WAREHOUSE_STAFF,      // 仓管员
  ADMINISTRATOR         // 管理员
}

interface MerchantTier {
  id: string
  name: string
  level: number
}

interface DiscountRange {
  minPercent: number
  maxPercent: number
}
```

### 2. 产品管理组件

**职责：**
- 产品创建和更新
- 配件和设备的库存跟踪
- 具有分级定价的价格管理
- 产品搜索和筛选

**接口：**

```typescript
interface ProductManagement {
  createAccessory(data: AccessoryData): AccessoryProduct
  createDevice(data: DeviceData): DeviceProduct
  updateProduct(id: string, updates: ProductUpdates): Product
  updatePrice(id: string, pricing: PricingData): Product
  searchProducts(criteria: SearchCriteria): Product[]
  getProductById(id: string): Product
  updateInventoryQuantity(barcode: string, delta: number): AccessoryProduct
  updateProductStatus(id: string, status: ProductStatus): Product
}

interface Product {
  id: string
  name: string
  category: ProductCategory
  purchasePrice: Money
  purchaseTax: Money
  taxClassification: TaxClassification
  suggestedRetailPrice: Money
  wholesalePrice: Money
  tierPricing: Map<MerchantTier, Money>
  procurementDate: timestamp
  status: ProductStatus
  warehouseLocation: string
  supplier: Supplier
  procurementInvoiceId: string
  salesStatus: SalesStatus
  priceHistory: PriceHistoryEntry[]
}

interface AccessoryProduct extends Product {
  barcode: string
  quantity: number
}

interface DeviceProduct extends Product {
  serialNumber: string  // SN或IMEI
  deviceType: DeviceType
  conditionGrade?: ConditionGrade  // 仅二手设备
}

enum ProductCategory {
  ACCESSORY,      // 配件
  NEW_DEVICE,     // 全新设备
  USED_DEVICE     // 二手设备
}

enum TaxClassification {
  VAT_23,           // 23%增值税
  MARGIN_VAT_0,     // 0%差额增值税
  SERVICE_VAT_13_5  // 13.5%服务增值税
}

enum ProductStatus {
  AVAILABLE,  // 可销售
  DAMAGED,    // 坏损
  SCRAPPED,   // 报废
  SOLD        // 已售
}

enum SalesStatus {
  UNSOLD,  // 未售
  SOLD     // 已售
}

enum DeviceType {
  NEW,   // 全新
  USED   // 二手
}

enum ConditionGrade {
  A_PLUS,  // A+
  A,       // A
  B,       // B
  C        // C
}

interface PricingData {
  suggestedRetailPrice?: Money
  wholesalePrice?: Money
  tierPricing?: Map<MerchantTier, Money>
}

interface SearchCriteria {
  query?: string  // 按名称、条形码、SN、IMEI搜索
  category?: ProductCategory
  status?: ProductStatus
  conditionGrade?: ConditionGrade
  supplier?: string
}
```

### 3. 定价组件

**职责：**
- 根据用户角色和商户等级计算价格
- 在授权范围内应用折扣
- 维护价格历史

**接口：**

```typescript
interface PricingComponent {
  getPriceForUser(product: Product, user: User): Money
  applyDiscount(amount: Money, discountPercent: number, user: User): Money
  validateDiscount(discountPercent: number, user: User): boolean
  calculateTax(amount: Money, taxClassification: TaxClassification): Money
  getPriceHistory(productId: string): PriceHistoryEntry[]
}

interface PriceHistoryEntry {
  timestamp: timestamp
  userId: string
  previousPrice: Money
  newPrice: Money
  priceType: PriceType
}

enum PriceType {
  RETAIL,        // 零售
  WHOLESALE,     // 批发
  TIER_SPECIFIC  // 分级特定
}
```

### 4. 销售发票组件

**职责：**
- 为客户购买生成销售发票
- 计算包含税费和折扣的总额
- 完成销售时更新库存
- 跟踪发票历史

**接口：**

```typescript
interface SalesInvoiceComponent {
  createInvoice(data: InvoiceData): SalesInvoice
  addLineItem(invoiceId: string, item: LineItem): SalesInvoice
  applyDiscount(invoiceId: string, discountPercent: number): SalesInvoice
  finalizeInvoice(invoiceId: string): SalesInvoice
  getInvoiceById(id: string): SalesInvoice
  getInvoicesByCustomer(customerId: string): SalesInvoice[]
}

interface SalesInvoice {
  id: string
  invoiceNumber: string
  customer: CustomerInfo
  lineItems: LineItem[]
  subtotal: Money
  discountPercent: number
  discountAmount: Money
  taxAmount: Money
  totalAmount: Money
  status: InvoiceStatus
  createdBy: string
  createdAt: timestamp
  finalizedAt?: timestamp
}

interface LineItem {
  productId: string
  productName: string
  quantity: number
  unitPrice: Money
  taxClassification: TaxClassification
  taxAmount: Money
  lineTotal: Money
  warehouseLocation: string
}

interface CustomerInfo {
  id?: string
  name: string
  email?: string
  phone?: string
  customerType: CustomerType
  merchantTier?: MerchantTier
}

enum CustomerType {
  RETAIL,      // 零售
  WHOLESALE    // 批发
}

enum InvoiceStatus {
  DRAFT,       // 草稿
  FINALIZED,   // 已确定
  CANCELLED    // 已取消
}
```

### 5. 采购组件

**职责：**
- 创建和管理采购订单
- 通过工作流跟踪订单状态
- 生成采购发票
- 确认收货时自动更新库存

**接口：**

```typescript
interface ProcurementComponent {
  createPurchaseOrder(data: PurchaseOrderData): PurchaseOrder
  updatePurchaseOrder(id: string, updates: PurchaseOrderUpdates): PurchaseOrder
  updateOrderStatus(id: string, status: OrderStatus, metadata?: StatusMetadata): PurchaseOrder
  finalizePurchaseOrder(id: string): PurchaseOrder
  cancelPurchaseOrder(id: string): PurchaseOrder
  createProcurementInvoice(data: ProcurementInvoiceData): ProcurementInvoice
  confirmReceipt(orderId: string): void  // 触发库存更新
}

interface PurchaseOrder {
  id: string
  orderNumber: string
  supplier: Supplier
  lineItems: PurchaseOrderLineItem[]
  totalAmount: Money
  status: OrderStatus
  statusHistory: StatusHistoryEntry[]
  orderDate?: timestamp
  trackingNumber?: string
  receivedDate?: timestamp
  confirmedDate?: timestamp
  createdBy: string
  createdAt: timestamp
  revisionHistory: RevisionEntry[]
}

interface PurchaseOrderLineItem {
  productSpecification: ProductSpecification
  quantity: number
  expectedUnitPrice: Money
  lineTotal: Money
}

interface ProductSpecification {
  name: string
  category: ProductCategory
  barcode?: string
  serialNumbers?: string[]
  deviceType?: DeviceType
  conditionGrade?: ConditionGrade
  taxClassification: TaxClassification
}

enum OrderStatus {
  DRAFT,      // 草稿
  SENT,       // 已发送
  ORDERED,    // 已下单
  SHIPPED,    // 已发货
  RECEIVED,   // 已收货
  CONFIRMED,  // 已确认
  CANCELLED   // 已取消
}

interface StatusMetadata {
  trackingNumber?: string
  notes?: string
}

interface StatusHistoryEntry {
  status: OrderStatus
  timestamp: timestamp
  userId: string
  metadata?: StatusMetadata
}

interface RevisionEntry {
  revisionNumber: number
  timestamp: timestamp
  userId: string
  changes: string
}

interface ProcurementInvoice {
  id: string
  invoiceNumber: string
  purchaseOrderId: string
  supplier: Supplier
  trackingNumber: string
  products: Product[]
  totalAmount: Money
  taxAmount: Money
  paymentMethod: PaymentMethod
  orderDate: timestamp
  deliveryDate: timestamp
  createdAt: timestamp
}

enum PaymentMethod {
  BANK_TRANSFER,  // 银行转账
  CREDIT_CARD,    // 信用卡
  CASH,           // 现金
  NET_30,         // 30天账期
  NET_60          // 60天账期
}
```

### 6. 库存组件

**职责：**
- 跟踪实时库存水平
- 根据销售和采购更新库存
- 管理仓储位置
- 生成库存报表

**接口：**

```typescript
interface InventoryComponent {
  getInventoryLevel(productId: string): number
  updateInventoryFromSale(invoiceId: string): void
  updateInventoryFromProcurement(orderId: string): void
  getAvailableProducts(category?: ProductCategory): Product[]
  updateWarehouseLocation(productId: string, location: string): Product
  getProductsByLocation(location: string): Product[]
  generateInventoryReport(criteria: ReportCriteria): InventoryReport
}

interface InventoryReport {
  generatedAt: timestamp
  totalProducts: number
  availableProducts: number
  productsByCategory: Map<ProductCategory, number>
  productsByStatus: Map<ProductStatus, number>
  lowStockItems: Product[]
  details: InventoryReportDetail[]
}

interface InventoryReportDetail {
  product: Product
  quantity: number
  value: Money
  location: string
}
```

### 7. 报表组件

**职责：**
- 生成商业智能报表
- 计算利润率
- 跟踪供应商绩效
- 提供销售分析

**接口：**

```typescript
interface ReportingComponent {
  generateSalesReport(criteria: ReportCriteria): SalesReport
  generateProcurementReport(criteria: ReportCriteria): ProcurementReport
  generateProfitMarginReport(criteria: ReportCriteria): ProfitMarginReport
  generateSupplierPerformanceReport(supplierId: string, criteria: ReportCriteria): SupplierReport
}

interface ReportCriteria {
  startDate?: timestamp
  endDate?: timestamp
  productCategory?: ProductCategory
  supplier?: string
  customerType?: CustomerType
}

interface SalesReport {
  generatedAt: timestamp
  period: DateRange
  totalRevenue: Money
  totalTax: Money
  salesByCategory: Map<ProductCategory, Money>
  salesByCustomerType: Map<CustomerType, Money>
  topSellingProducts: ProductSalesDetail[]
  invoiceCount: number
}

interface ProcurementReport {
  generatedAt: timestamp
  period: DateRange
  totalProcurementCost: Money
  ordersByStatus: Map<OrderStatus, number>
  ordersBySupplier: Map<string, ProcurementDetail>
  averageDeliveryTime: number
}

interface ProfitMarginReport {
  generatedAt: timestamp
  period: DateRange
  totalRevenue: Money
  totalCost: Money
  grossProfit: Money
  profitMargin: number
  profitByCategory: Map<ProductCategory, ProfitDetail>
}

interface SupplierReport {
  supplier: Supplier
  period: DateRange
  totalOrders: number
  totalValue: Money
  averageDeliveryTime: number
  onTimeDeliveryRate: number
  qualityIssues: number
}
```

### 8. 供应商管理组件

**职责：**
- 维护供应商信息
- 跟踪供应商关系
- 管理供应商状态

**接口：**

```typescript
interface SupplierManagement {
  createSupplier(data: SupplierData): Supplier
  updateSupplier(id: string, updates: SupplierUpdates): Supplier
  getSupplierById(id: string): Supplier
  getAllSuppliers(activeOnly: boolean): Supplier[]
  setSupplierStatus(id: string, active: boolean): Supplier
  getSupplierPurchaseHistory(id: string): PurchaseOrder[]
}

interface Supplier {
  id: string
  name: string
  contactPerson: string
  email: string
  phone: string
  address: string
  taxId: string
  paymentTerms: string
  active: boolean
  createdAt: timestamp
  notes: string
}
```

## 数据模型

### 核心实体

**用户实体：**
- 主键：id (UUID)
- 唯一：username
- 索引：role, merchantTier
- 关系：与SalesInvoice、PurchaseOrder一对多

**产品实体：**
- 主键：id (UUID)
- 唯一：barcode（配件）、serialNumber（设备）
- 索引：category, status, supplier, barcode, serialNumber
- 关系：
  - 与Supplier多对一
  - 与ProcurementInvoice多对一
  - 与PriceHistoryEntry一对多

**配件产品实体（扩展Product）：**
- 附加字段：barcode, quantity
- 约束：quantity >= 0

**设备产品实体（扩展Product）：**
- 附加字段：serialNumber, deviceType, conditionGrade
- 约束：serialNumber必须唯一

**销售发票实体：**
- 主键：id (UUID)
- 唯一：invoiceNumber
- 索引：customer, status, createdAt
- 关系：
  - 与User（createdBy）多对一
  - 与LineItem一对多

**采购订单实体：**
- 主键：id (UUID)
- 唯一：orderNumber
- 索引：supplier, status, createdAt
- 关系：
  - 与Supplier多对一
  - 与User（createdBy）多对一
  - 与PurchaseOrderLineItem一对多
  - 与ProcurementInvoice一对一

**采购发票实体：**
- 主键：id (UUID)
- 唯一：invoiceNumber
- 索引：supplier, purchaseOrderId, deliveryDate
- 关系：
  - 与Supplier多对一
  - 与PurchaseOrder一对一
  - 与Product一对多

**供应商实体：**
- 主键：id (UUID)
- 唯一：taxId
- 索引：name, active

### 数据库模式考虑

- 使用数据库级约束确保唯一性（barcode、serialNumber、invoiceNumber）
- 实施软删除以保留审计跟踪（标记为不活跃而不是删除）
- 对更新多个表的操作使用事务（例如，确定发票）
- 对库存的并发更新实施乐观锁定
- 将货币值存储为具有适当精度的十进制类型
- 对所有日期/时间字段使用带时区的时间戳

### 数据验证规则

- 所有货币值必须为非负数
- 折扣百分比必须在0到100之间
- 税率是固定常量（23%、0%、13.5%）
- 序列号必须匹配格式：字母数字，8-20个字符
- 条形码必须匹配格式：数字，8-13位
- 电子邮件地址必须是有效格式
- 电话号码必须是有效格式
- 仓储位置必须存在于预定义位置列表中


## 正确性属性

属性是在系统的所有有效执行中应该保持为真的特征或行为——本质上是关于系统应该做什么的正式陈述。属性充当人类可读规范和机器可验证正确性保证之间的桥梁。

### 认证和授权属性

**属性1：有效认证授予基于角色的访问**
*对于任何*具有有效凭证的用户，认证应该成功并授予与其分配角色相对应的权限。
**验证：需求 1.1, 1.2, 1.3, 1.4, 1.5**

**属性2：无效凭证被拒绝**
*对于任何*无效的用户名/密码组合，认证尝试应该失败并显示适当的错误消息。
**验证：需求 1.6**

**属性3：商户等级决定定价可见性**
*对于任何*批发商户和任何产品，显示的价格应该与为该商户等级配置的价格匹配。
**验证：需求 6.2, 6.3**

**属性4：商户无法访问其他等级定价**
*对于任何*批发商户，查询产品价格应该只返回其自己等级的定价，绝不返回其他等级的定价。
**验证：需求 6.4**

### 产品管理属性

**属性5：产品包含必需信息**
*对于任何*在系统中创建的产品，它应该填充所有必需字段：进货价、进货税、建议零售价、批发价、分级定价、采购日期、状态、仓储位置、供应商、采购发票引用和销售状态。
**验证：需求 2.1, 2.2, 2.3**

**属性6：产品更新被持久化**
*对于任何*产品和任何有效更新，更新产品然后检索它应该反映所做的更改。
**验证：需求 2.4**

**属性7：税务计算匹配分类**
*对于任何*产品，计算的税费应该等于：VAT_23为基础价格的23%，Margin_VAT_0为0%，或Service_VAT_13_5为13.5%。
**验证：需求 2.5, 17.1, 17.2, 17.3**

**属性8：配件通过条形码标识**
*对于任何*配件产品，它应该有一个有效的条形码并支持基于数量的库存跟踪。
**验证：需求 3.1, 3.3**

**属性9：配件数量按条形码累积**
*对于任何*条形码，添加具有相同条形码的多个配件产品应该在该单个条形码下累积总数量。
**验证：需求 3.2**

**属性10：销售减少配件库存**
*对于任何*配件产品和任何销售数量，完成销售应该将库存数量减少恰好售出的数量。
**验证：需求 3.4, 7.5**

**属性11：设备具有唯一序列号**
*对于任何*系统中的两个设备产品，它们的序列号（SN或IMEI）应该是不同的，尝试创建具有重复序列号的设备应该失败。
**验证：需求 4.1, 4.2, 4.6**

**属性12：全新设备具有正确分类**
*对于任何*创建的全新设备，它应该被分类为NEW设备类型，税务分类为VAT_23。
**验证：需求 4.3**

**属性13：二手设备需要成色等级**
*对于任何*二手设备，它应该有一个成色等级（A+、A、B或C）并允许VAT_23或Margin_VAT_0税务分类。
**验证：需求 4.4, 4.5**

### 定价属性

**属性14：价格更新为非负数**
*对于任何*价格更新操作，负价格应该被拒绝，非负价格应该被接受并立即应用于未来交易。
**验证：需求 5.1, 5.4**

**属性15：维护价格历史**
*对于任何*产品价格更新，应该创建一个历史条目，记录先前价格、新价格、时间戳和进行更改的用户。
**验证：需求 5.3**

**属性16：发票价格不可变**
*对于任何*已确定的销售发票，之后更改产品价格不应该影响该发票中记录的价格。
**验证：需求 5.5**

**属性17：可以更新多种价格类型**
*对于任何*产品，系统应该允许独立或一起更新零售价、批发价和分级批发价。
**验证：需求 5.2**

**属性18：分级定价支持多个级别**
*对于任何*产品，它应该支持多个商户等级的不同定价，等级修改应该更新定价可见性。
**验证：需求 6.1, 6.5**

### 销售发票属性

**属性19：发票包含完整信息**
*对于任何*创建的销售发票，它应该包括客户信息、产品详情、数量、单价、税务计算和总金额。
**验证：需求 7.1**

**属性20：发票总额计算正确**
*对于任何*销售发票，总金额应该等于所有行项目小计的总和加上所有适用税费的总和，减去应用的任何折扣。
**验证：需求 7.2, 17.4**

**属性21：折扣根据授权范围验证**
*对于任何*仓管员和任何折扣百分比，如果折扣在其授权范围内应该成功应用，如果超出范围应该失败并显示错误。
**验证：需求 7.3, 8.2, 8.3**

**属性22：已确定发票更新产品状态**
*对于任何*销售发票，确定它应该将所有包含产品的销售状态更新为SOLD，并将配件库存数量减少售出的数量。
**验证：需求 7.4, 7.5**

**属性23：折扣范围可按员工配置**
*对于任何*仓管员，管理员应该能够设置不同的最小和最大折扣百分比，这些范围应该立即强制执行。
**验证：需求 8.1, 8.4, 8.5**

### 采购属性

**属性24：采购订单包含必需信息**
*对于任何*创建的采购订单，它应该包括供应商信息、产品规格、数量、预期价格和唯一的订单号。
**验证：需求 9.1, 9.2**

**属性25：新采购订单从草稿状态开始**
*对于任何*新创建的采购订单，其初始状态应该是DRAFT并应该允许修改。
**验证：需求 9.3, 9.4**

**属性26：采购订单状态转换有效**
*对于任何*采购订单，状态更新应该遵循进展：DRAFT → SENT → ORDERED → SHIPPED → RECEIVED → CONFIRMED，无效转换应该被拒绝。
**验证：需求 9.5, 11.5**

**属性27：草稿和已发送订单可以修改**
*对于任何*状态为DRAFT或SENT的采购订单，管理员应该能够修改产品数量和规格，每次修改应该创建修订历史条目。
**验证：需求 10.1, 10.2**

**属性28：已确定订单防止修改**
*对于任何*状态为ORDERED或更晚的采购订单，尝试修改产品详情应该被拒绝。
**验证：需求 10.3**

**属性29：订单可以在发货前取消**
*对于任何*状态在SHIPPED之前的采购订单，管理员应该能够取消它，将其状态更新为CANCELLED。
**验证：需求 10.4, 10.5**

**属性30：状态转换设置必需元数据**
*对于任何*采购订单，更新到ORDERED应该设置订单日期，更新到SHIPPED应该要求跟踪号，更新到RECEIVED应该设置收货日期。
**验证：需求 11.1, 11.2, 11.3**

**属性31：已确认订单更新库存**
*对于任何*采购订单，将其状态更新为CONFIRMED应该为订单中的所有产品创建库存记录，配件添加数量，设备创建单独记录。
**验证：需求 11.4, 12.1, 12.2, 12.3**

**属性32：新库存可用**
*对于任何*从已确认采购订单添加到库存的产品，其状态应该是AVAILABLE，并应该链接到来源采购发票。
**验证：需求 12.4, 12.5**

**属性33：采购发票包含必需信息**
*对于任何*创建的采购发票，它应该包括供应商信息、跟踪号、产品列表、总金额、税务分类、付款方式、订单日期、交付日期和到对应采购订单的链接。
**验证：需求 13.1, 13.2, 13.5**

**属性34：采购发票总额包含税费**
*对于任何*采购发票，总金额应该等于所有产品成本的总和加上根据每个产品的税务分类计算的适用税费。
**验证：需求 13.3, 17.5**

**属性35：产品可以按采购发票查询**
*对于任何*采购发票，按该发票查询产品应该返回与该发票关联的所有且仅有的产品。
**验证：需求 13.4**

### 库存管理属性

**属性36：产品状态转换有效**
*对于任何*产品，系统应该允许状态更新为AVAILABLE、DAMAGED、SCRAPPED或SOLD，一旦状态为SOLD，应该拒绝进一步的状态更改。
**验证：需求 14.1, 14.3**

**属性37：状态影响可用性计数**
*对于任何*产品，当其状态为AVAILABLE时，应该包含在可用库存计数中；当状态为DAMAGED、SCRAPPED或SOLD时，应该从可用计数中排除。
**验证：需求 14.2, 14.5**

**属性38：状态更改被记录**
*对于任何*产品状态更新，应该创建一个历史条目，记录先前状态、新状态、时间戳和进行更改的用户。
**验证：需求 14.4**

**属性39：仓储位置被验证**
*对于任何*产品位置更新，系统应该接受有效的仓储位置并拒绝无效位置并显示错误消息。
**验证：需求 15.1, 15.2**

**属性40：产品可以按位置搜索**
*对于任何*仓储位置，按该位置搜索产品应该返回当前分配到该位置的所有且仅有的产品。
**验证：需求 15.3**

**属性41：发票显示仓储位置**
*对于任何*销售发票行项目，它应该包括产品的仓储位置以供拣货。
**验证：需求 15.4**

### 报表属性

**属性42：报表包含必需部分**
*对于任何*生成的报表，库存报表应该包括按类别的库存水平，销售报表应该包括按期间/类别/客户类型的收入细分，采购报表应该包括成本和供应商绩效。
**验证：需求 16.1, 16.2, 16.3**

**属性43：利润率计算正确**
*对于任何*利润率报表，利润率应该等于（总收入 - 总成本）/ 总收入，利润应该按产品类别细分。
**验证：需求 16.4**

**属性44：报表支持筛选**
*对于任何*应用筛选器的报表请求，返回的数据应该只包括匹配指定日期范围、产品类别、供应商和客户类型筛选器的记录。
**验证：需求 16.5**

### 搜索和查询属性

**属性45：产品可以按多个标准搜索**
*对于任何*搜索查询，系统应该返回在名称、条形码、SN或IMEI字段中匹配查询的产品。
**验证：需求 18.1**

**属性46：产品可以按属性筛选**
*对于任何*应用的筛选器（类别、状态或成色等级），返回的产品应该全部匹配筛选标准。
**验证：需求 18.2, 18.3, 18.4**

### 供应商管理属性

**属性47：供应商包含必需信息**
*对于任何*创建的供应商，它应该填充名称、联系信息、付款条款和税务识别。
**验证：需求 19.1, 19.2**

**属性48：供应商记录可以查询**
*对于任何*供应商，按该供应商查询采购订单和采购发票应该返回所有关联记录。
**验证：需求 19.3**

**属性49：不活跃供应商防止新订单**
*对于任何*标记为不活跃的供应商，尝试为该供应商创建新采购订单应该被拒绝并显示错误消息。
**验证：需求 19.4, 19.5**

### 数据完整性属性

**属性50：必填字段被验证**
*对于任何*记录创建或更新操作，如果必填字段缺失或数值超出可接受范围，操作应该被拒绝并显示适当的错误消息。
**验证：需求 20.1, 20.2**

**属性51：维护引用完整性**
*对于任何*被其他记录引用的记录，尝试删除它应该被拒绝，所有外键引用应该指向现有记录。
**验证：需求 20.3, 20.5**

**属性52：库存数量保持非负**
*对于任何*会导致库存数量变为负数的操作，操作应该被拒绝并显示错误消息。
**验证：需求 20.4**

## 错误处理

### 错误类别

1. **验证错误**：无效输入数据、缺少必填字段、超出范围的值
2. **认证错误**：无效凭证、过期令牌、权限不足
3. **业务规则违规**：负库存、无效状态转换、未授权折扣
4. **引用完整性错误**：引用不存在的记录、删除被引用的记录
5. **并发错误**：乐观锁定失败、竞态条件

### 错误响应格式

所有错误应该遵循一致的格式：

```typescript
interface ErrorResponse {
  code: string
  message: string
  details?: object
  timestamp: timestamp
  requestId: string
}
```

### 错误处理策略

- **验证错误**：返回400 Bad Request，包含特定字段级错误详情
- **认证错误**：根据情况返回401 Unauthorized或403 Forbidden
- **业务规则违规**：返回422 Unprocessable Entity，包含解释
- **未找到错误**：返回404 Not Found，包含资源标识符
- **并发错误**：返回409 Conflict，包含重试指导
- **服务器错误**：返回500 Internal Server Error，包含清理后的错误消息（记录完整详情）

### 关键错误场景

1. **库存同步**：如果发票确定期间库存更新失败，回滚整个事务
2. **付款处理**：如果付款失败，不要确定发票或更新库存
3. **采购确认**：如果订单确认期间库存更新失败，标记订单为需要人工审查
4. **并发更新**：使用乐观锁定防止多个用户修改同一记录时的更新丢失
5. **数据损坏**：实施数据库约束和应用程序级验证以防止无效数据状态

## 测试策略

### 双重测试方法

系统需要单元测试和基于属性的测试以实现全面覆盖：

- **单元测试**：验证特定示例、边缘情况和错误条件
- **属性测试**：验证所有输入的通用属性

两种方法是互补的且都是必需的。单元测试捕获特定场景中的具体错误，而属性测试验证广泛输入范围内的一般正确性。

### 单元测试重点

单元测试应该关注：
- 演示正确行为的特定示例（例如，使用已知值创建特定产品）
- 组件之间的集成点（例如，发票确定触发库存更新）
- 边缘情况和错误条件（例如，尝试销售超过可用数量的配件）
- 具有特定场景的复杂业务逻辑（例如，多级定价计算）

避免为基于属性的测试可以通过随机化覆盖的场景编写太多单元测试。

### 基于属性的测试

**库选择**：使用适合实现语言的基于属性的测试库：
- Python：Hypothesis
- TypeScript/JavaScript：fast-check
- Java：jqwik或QuickCheck
- C#：FsCheck

**测试配置**：
- 由于随机化，每个属性测试必须运行最少100次迭代
- 每个属性测试必须引用其设计文档属性编号
- 标签格式：`Feature: 3c-product-management-system, Property {number}: {property_text}`

**属性测试实现**：
- 上面列出的每个正确性属性应该由单个基于属性的测试实现
- 在有效范围内生成随机测试数据（用户、产品、发票、订单）
- 验证属性对所有生成的输入都成立
- 当属性失败时使用收缩找到最小失败示例

### 测试覆盖目标

- **代码覆盖率**：最低80%行覆盖率，70%分支覆盖率
- **属性覆盖率**：所有52个正确性属性必须有相应的属性测试
- **集成测试**：测试完整工作流程（采购到库存、销售到发票）
- **性能测试**：验证搜索/筛选操作满足10万产品的2秒要求
- **安全测试**：验证基于角色的访问控制防止未授权操作

### 测试工作流程

1. 首先根据正确性属性编写属性测试
2. 为特定示例和边缘情况编写单元测试
3. 运行具有高迭代次数（100+）的属性测试以发现边缘情况
4. 使用失败的属性测试示例创建回归单元测试
5. 在CI/CD管道中持续运行两个测试套件
