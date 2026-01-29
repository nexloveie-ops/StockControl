# 实施计划：3C产品管理系统

## 概述

本实施计划将3C产品管理系统的设计分解为可执行的编码任务。该系统使用TypeScript实现，采用分层架构，具有清晰的数据模型、业务逻辑和API层分离。实施将从核心数据模型和基础设施开始，然后构建业务逻辑组件，最后集成所有部分。

系统支持基于角色的访问控制、多种产品类型（配件和设备）、分级定价、税务管理以及完整的采购到销售工作流程。测试策略包括单元测试和基于属性的测试（使用fast-check），以确保全面覆盖。

## 任务

- [ ] 1. 设置项目结构和核心基础设施
  - 创建TypeScript项目，配置tsconfig.json
  - 设置数据库连接（PostgreSQL）和ORM（例如TypeORM或Prisma）
  - 配置测试框架（Jest）和fast-check用于基于属性的测试
  - 创建目录结构：src/models、src/services、src/api、src/utils、tests/
  - 设置环境配置和日志记录
  - _需求：20.1, 20.2, 20.5_

- [ ] 2. 实现核心数据模型和类型定义
  - [ ] 2.1 创建基础类型和枚举
    - 定义UserRole、ProductCategory、TaxClassification、ProductStatus等枚举
    - 定义Money、Timestamp等基础类型
    - 创建共享接口（User、Product、Supplier等）
    - _需求：1.1, 2.1, 3.1, 4.1_

  - [ ] 2.2 实现产品数据模型
    - 创建Product基类及其属性
    - 实现AccessoryProduct扩展（barcode、quantity）
    - 实现DeviceProduct扩展（serialNumber、deviceType、conditionGrade）
    - 添加数据库约束（唯一性、非负数量）
    - _需求：2.1, 2.2, 3.1, 3.2, 4.1, 4.2, 4.6_

  - [ ]* 2.3 编写产品模型的属性测试
    - **属性11：设备具有唯一序列号**
    - **验证：需求 4.1, 4.2, 4.6**

  - [ ] 2.4 实现用户和角色数据模型
    - 创建User实体，包含role、merchantTier、discountRange
    - 实现MerchantTier和DiscountRange类型
    - 添加数据库索引和约束
    - _需求：1.1, 1.2, 1.3, 1.4, 1.5_

  - [ ] 2.5 实现发票数据模型
    - 创建SalesInvoice实体及LineItem
    - 创建PurchaseOrder实体及PurchaseOrderLineItem
    - 创建ProcurementInvoice实体
    - 添加关系和外键约束
    - _需求：7.1, 9.1, 13.1_

  - [ ] 2.6 实现供应商数据模型
    - 创建Supplier实体及其所有字段
    - 添加唯一约束（taxId）和索引
    - _需求：19.1, 19.2_

- [ ] 3. 实现认证和授权组件
  - [ ] 3.1 实现用户认证服务
    - 创建authenticate()方法，验证用户名和密码
    - 实现JWT令牌生成和验证
    - 创建validateToken()方法
    - _需求：1.1, 1.6_

  - [ ]* 3.2 编写认证的属性测试
    - **属性1：有效认证授予基于角色的访问**
    - **属性2：无效凭证被拒绝**
    - **验证：需求 1.1, 1.2, 1.3, 1.4, 1.5, 1.6**

  - [ ] 3.3 实现基于角色的访问控制
    - 创建checkPermission()方法
    - 实现权限映射（角色到权限）
    - 创建API中间件以强制执行权限
    - _需求：1.2, 1.3, 1.4, 1.5_

  - [ ]* 3.4 编写RBAC的单元测试
    - 测试每个角色的权限检查
    - 测试权限拒绝场景
    - _需求：1.2, 1.3, 1.4, 1.5_
