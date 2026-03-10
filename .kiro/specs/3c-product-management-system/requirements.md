# Requirements Document: 3C Product Management System

## Introduction

This document defines the requirements for implementing a three-category product classification system for the 3C (Computer, Communication, Consumer Electronics) product management system. The system introduces three distinct product categories (DEVICE, SIMPLE_ACCESSORY, TEMPLATE) with different inventory tracking strategies, user-specific system information management, and multi-dimensional product variants with optional inventory tracking.

The new system maintains backward compatibility with existing inventory while providing flexible product management capabilities that minimize user effort and support various business workflows including sales without purchase records for accessories.

## Glossary

- **System**: The 3C Product Management System
- **Product_Category**: One of three types: DEVICE, SIMPLE_ACCESSORY, or TEMPLATE
- **DEVICE**: Products with IMEI or serial numbers requiring individual tracking and full purchase-sale-inventory management
- **SIMPLE_ACCESSORY**: Products with barcodes requiring batch management and inventory tracking
- **TEMPLATE**: Product templates supporting multi-dimensional variants with optional inventory tracking
- **User_System_Info**: User-specific system configuration data including product templates, variant dimensions, and categories
- **Product_Template**: A template-based product definition with multiple variant dimensions
- **Variant_Dimension**: A configurable attribute of a product template (e.g., iPhone Models, Colors)
- **Variant_Combination**: A specific combination of variant dimension values representing a sellable product
- **Inventory_Tracking**: The capability to track stock quantities for products
- **MerchantInventory**: Current merchant inventory database table
- **AdminInventory**: Admin/warehouse inventory database table
- **MerchantSale**: Sales records database table
- **Migration**: The process of converting existing inventory data to the new classification system
- **Round_Trip_Property**: A property where parsing then printing then parsing produces an equivalent object

## Requirements

### Requirement 1: Three-Category Product Classification

**User Story:** As a system administrator, I want to classify products into three distinct categories, so that I can manage different product types with appropriate tracking strategies.

#### Acceptance Criteria

1. THE System SHALL support three product categories: DEVICE, SIMPLE_ACCESSORY, and TEMPLATE
2. WHEN a product is classified as DEVICE, THE System SHALL require IMEI or serial number for individual tracking
3. WHEN a product is classified as SIMPLE_ACCESSORY, THE System SHALL require barcode for batch management
4. WHEN a product is classified as TEMPLATE, THE System SHALL support multi-dimensional variants with optional inventory tracking
5. THE System SHALL store the product category in the database for each product record
6. THE System SHALL validate that each product has exactly one category assignment

### Requirement 2: DEVICE Category Management

**User Story:** As a merchant, I want to manage devices with individual tracking, so that I can track each device's purchase, sale, and inventory status.

#### Acceptance Criteria

1. WHEN a product is classified as DEVICE, THE System SHALL require either IMEI or serial number
2. THE System SHALL enforce uniqueness of IMEI and serial numbers within the DEVICE category
3. WHEN a DEVICE is purchased, THE System SHALL record the purchase transaction with supplier information
4. WHEN a DEVICE is sold, THE System SHALL update the device status to sold and record the sale transaction
5. THE System SHALL maintain full purchase-sale-inventory history for each DEVICE
6. THE System SHALL support condition tracking for DEVICE products (e.g., BRAND_NEW, PRE_OWNED, REFURBISHED)

### Requirement 3: SIMPLE_ACCESSORY Category Management

**User Story:** As a merchant, I want to manage accessories with batch tracking, so that I can efficiently handle products that don't require individual identification.

#### Acceptance Criteria

1. WHEN a product is classified as SIMPLE_ACCESSORY, THE System SHALL require a barcode
2. THE System SHALL track inventory quantity for SIMPLE_ACCESSORY products
3. WHEN a SIMPLE_ACCESSORY is sold, THE System SHALL decrement the inventory quantity
4. WHEN a SIMPLE_ACCESSORY is restocked, THE System SHALL increment the inventory quantity
5. THE System SHALL support batch operations for SIMPLE_ACCESSORY products
6. THE System SHALL maintain inventory quantity with minimum value of zero

### Requirement 4: User-Specific System Information

**User Story:** As a user, I want to define my own product templates and variant dimensions, so that I can customize the system to match my business needs.

#### Acceptance Criteria

1. THE System SHALL associate User_System_Info with a specific userId
2. WHEN a user creates system information, THE System SHALL store it with the user's identifier
3. THE System SHALL isolate User_System_Info so that users can only view and edit their own data
4. THE System SHALL support user-defined variant dimensions (e.g., iPhone Models, Colors, Sizes)
5. WHEN a user edits system information, THE System SHALL update only the user's own data
6. THE System SHALL support multiple variant dimensions per user with configurable values

### Requirement 5: Product Template with Multi-Dimensional Variants

**User Story:** As a user, I want to create product templates with multiple variant dimensions, so that I can efficiently manage products with many variations without creating individual records for each combination.

#### Acceptance Criteria

1. WHEN a user creates a Product_Template, THE System SHALL allow linking to user-defined variant dimensions
2. THE System SHALL support multiple variant dimensions per Product_Template
3. WHEN a user adds variant dimensions, THE System SHALL allow specifying values for each dimension
4. THE System SHALL store pricing information (cost price, wholesale price, retail price) for each Variant_Combination
5. WHEN a user enters variant data, THE System SHALL validate that all required pricing fields are provided
6. THE System SHALL support optional inventory quantity tracking per Variant_Combination
7. WHEN a variant has zero inventory and inventory tracking is enabled, THE System SHALL not display it in the frontend
8. THE System SHALL dynamically combine variant information during sales without pre-generating all combinations

### Requirement 6: Optional Inventory Tracking Toggle

**User Story:** As a user, I want to optionally enable inventory tracking for product templates, so that I can choose whether to track stock levels based on my business needs.

#### Acceptance Criteria

1. THE Product_Template SHALL include a trackInventory boolean field
2. WHEN trackInventory is true, THE System SHALL maintain inventory quantities for each Variant_Combination
3. WHEN trackInventory is false, THE System SHALL record sales without inventory validation
4. WHEN trackInventory is false, THE System SHALL generate sales reports and purchase suggestions without inventory constraints
5. WHEN a sale occurs for a template with trackInventory enabled, THE System SHALL decrement the variant inventory quantity
6. WHEN a sale occurs for a template with trackInventory disabled, THE System SHALL record the sale without inventory updates

### Requirement 7: Sales Process for Template-Based Products

**User Story:** As a merchant, I want to sell template-based products by dynamically selecting variants, so that I can complete sales efficiently without pre-generating all product combinations.

#### Acceptance Criteria

1. WHEN a merchant initiates a sale for a TEMPLATE product, THE System SHALL display available variant dimensions
2. THE System SHALL allow the merchant to select values for each variant dimension
3. WHEN variant selections are made, THE System SHALL retrieve the corresponding pricing information
4. THE System SHALL capture the selected Variant_Combination details in the sale record
5. WHEN trackInventory is enabled and inventory is insufficient, THE System SHALL prevent the sale and display an error message
6. WHEN trackInventory is disabled, THE System SHALL allow the sale regardless of inventory status
7. THE System SHALL record the complete variant details at the time of sale in MerchantSale

### Requirement 8: Purchase Records and VAT Handling

**User Story:** As a merchant, I want to submit purchase invoices directly to tax authorities without entering them into the system, so that I can minimize data entry effort while claiming VAT.

#### Acceptance Criteria

1. WHEN a product is classified as SIMPLE_ACCESSORY or TEMPLATE, THE System SHALL not require purchase record entry
2. THE System SHALL support sales recording without corresponding purchase records for SIMPLE_ACCESSORY and TEMPLATE products
3. THE System SHALL generate sales reports for products without purchase records
4. THE System SHALL provide purchase suggestions based on sales data and inventory levels
5. WHEN a DEVICE is purchased, THE System SHALL require purchase record entry for full tracking
6. THE System SHALL maintain VAT calculation capabilities for all product categories

### Requirement 9: Backward Compatibility and Migration

**User Story:** As a system administrator, I want to migrate existing inventory to the new classification system, so that I can preserve historical data while adopting the new structure.

#### Acceptance Criteria

1. THE System SHALL maintain compatibility with existing MerchantInventory records
2. WHEN migration occurs, THE System SHALL classify existing products based on their attributes (serialNumber, barcode, category)
3. THE System SHALL assign DEVICE category to products with serialNumber or IMEI
4. THE System SHALL assign SIMPLE_ACCESSORY category to products with barcode and no serialNumber
5. THE System SHALL preserve all existing product data during migration
6. THE System SHALL provide a migration report showing classification results
7. WHEN migration is complete, THE System SHALL validate data integrity using round-trip properties
8. FOR ALL migrated products, reading then writing then reading SHALL produce equivalent product records

### Requirement 10: User System Info Data Model

**User Story:** As a developer, I want a well-defined data model for user-specific system information, so that I can implement the feature correctly.

#### Acceptance Criteria

1. THE System SHALL define a UserSystemInfo model with userId, name, type, and values fields
2. THE UserSystemInfo model SHALL support types including VARIANT_DIMENSION, CATEGORY, and PRODUCT_MODEL
3. WHEN a UserSystemInfo record is created, THE System SHALL validate that userId is provided
4. THE System SHALL enforce uniqueness of (userId, name, type) combinations
5. THE UserSystemInfo model SHALL store values as an array of strings
6. THE System SHALL support CRUD operations for UserSystemInfo records
7. THE System SHALL index UserSystemInfo by userId for efficient queries

### Requirement 11: Product Template Data Model

**User Story:** As a developer, I want a well-defined data model for product templates, so that I can implement variant management correctly.

#### Acceptance Criteria

1. THE System SHALL define a ProductTemplate model with userId, name, category, trackInventory, and variantDimensions fields
2. THE ProductTemplate model SHALL include a variants array storing Variant_Combination data
3. WHEN a ProductTemplate is created, THE System SHALL validate that userId and name are provided
4. THE System SHALL store variant pricing (costPrice, wholesalePrice, retailPrice) for each Variant_Combination
5. THE System SHALL store optional inventory quantity for each Variant_Combination
6. THE ProductTemplate model SHALL reference UserSystemInfo for variant dimension definitions
7. THE System SHALL support CRUD operations for ProductTemplate records
8. THE System SHALL index ProductTemplate by userId and category for efficient queries

### Requirement 12: Sales Record Enhancement

**User Story:** As a merchant, I want sales records to capture complete variant information, so that I can track what was sold with full detail.

#### Acceptance Criteria

1. WHEN a TEMPLATE product is sold, THE MerchantSale record SHALL include variant dimension values
2. THE System SHALL store the selected Variant_Combination in the sale item
3. THE System SHALL preserve variant information even if the Product_Template is later modified
4. THE MerchantSale model SHALL support a variantInfo field containing dimension-value pairs
5. THE System SHALL display variant information in sales reports and receipts
6. WHEN a sale is recorded, THE System SHALL validate that all required variant dimensions have values

### Requirement 13: Inventory Display and Filtering

**User Story:** As a merchant, I want to view inventory filtered by product category, so that I can manage different product types efficiently.

#### Acceptance Criteria

1. THE System SHALL provide inventory filtering by Product_Category
2. WHEN filtering by DEVICE, THE System SHALL display products with IMEI or serial numbers
3. WHEN filtering by SIMPLE_ACCESSORY, THE System SHALL display products with barcodes and quantities
4. WHEN filtering by TEMPLATE, THE System SHALL display product templates with variant summaries
5. THE System SHALL support search across all product categories
6. WHEN a variant has zero inventory and trackInventory is enabled, THE System SHALL exclude it from the display

### Requirement 14: Reporting and Analytics

**User Story:** As a merchant, I want to generate reports for all product categories, so that I can analyze sales performance and inventory status.

#### Acceptance Criteria

1. THE System SHALL generate sales reports including all three product categories
2. THE System SHALL calculate profit margins for DEVICE, SIMPLE_ACCESSORY, and TEMPLATE products
3. THE System SHALL provide inventory valuation reports by category
4. THE System SHALL generate purchase suggestions for SIMPLE_ACCESSORY and TEMPLATE products based on sales velocity
5. WHEN trackInventory is disabled, THE System SHALL include sales data in reports without inventory constraints
6. THE System SHALL support date range filtering for all reports

### Requirement 15: API Endpoints for Product Management

**User Story:** As a frontend developer, I want RESTful API endpoints for product management, so that I can build user interfaces for the new features.

#### Acceptance Criteria

1. THE System SHALL provide POST /api/user-system-info endpoint for creating user-specific system information
2. THE System SHALL provide GET /api/user-system-info endpoint for retrieving user-specific system information
3. THE System SHALL provide POST /api/product-templates endpoint for creating product templates
4. THE System SHALL provide GET /api/product-templates endpoint for retrieving product templates with variant data
5. THE System SHALL provide PUT /api/product-templates/:id endpoint for updating product templates
6. THE System SHALL provide DELETE /api/product-templates/:id endpoint for deleting product templates
7. THE System SHALL provide POST /api/sales/template endpoint for recording template-based sales
8. THE System SHALL validate authentication and authorization for all endpoints
9. THE System SHALL return appropriate HTTP status codes and error messages

### Requirement 16: Data Validation and Error Handling

**User Story:** As a user, I want clear error messages when data validation fails, so that I can correct issues quickly.

#### Acceptance Criteria

1. WHEN required fields are missing, THE System SHALL return a descriptive error message
2. WHEN a duplicate IMEI or serial number is detected, THE System SHALL prevent creation and return an error
3. WHEN inventory quantity is insufficient for a sale, THE System SHALL prevent the sale and display available quantity
4. WHEN variant pricing is invalid or negative, THE System SHALL reject the input and return an error
5. THE System SHALL validate that trackInventory is a boolean value
6. WHEN a user attempts to access another user's system information, THE System SHALL return an authorization error
7. THE System SHALL log validation errors for debugging purposes

### Requirement 17: Performance and Scalability

**User Story:** As a system administrator, I want the system to perform efficiently with large datasets, so that users experience fast response times.

#### Acceptance Criteria

1. THE System SHALL respond to product template queries within 500 milliseconds for datasets up to 10,000 templates
2. THE System SHALL support pagination for product template listings
3. THE System SHALL use database indexes on userId, category, and frequently queried fields
4. WHEN variant combinations exceed 100 per template, THE System SHALL load variants on demand rather than all at once
5. THE System SHALL cache frequently accessed User_System_Info data
6. THE System SHALL optimize sales queries to avoid full table scans

### Requirement 18: User Interface Requirements

**User Story:** As a merchant, I want an intuitive user interface for managing product templates, so that I can configure products with minimal training.

#### Acceptance Criteria

1. THE System SHALL provide a form for creating product templates with variant dimensions
2. THE System SHALL display variant dimensions as selectable dropdowns populated from User_System_Info
3. WHEN a user adds a variant dimension, THE System SHALL allow adding multiple values
4. THE System SHALL provide a grid or table interface for entering pricing and inventory for each Variant_Combination
5. THE System SHALL display a toggle switch for the trackInventory option
6. THE System SHALL provide visual feedback when saving product templates
7. THE System SHALL display validation errors inline near the relevant form fields

### Requirement 19: Security and Access Control

**User Story:** As a system administrator, I want to ensure that users can only access their own data, so that data privacy is maintained.

#### Acceptance Criteria

1. THE System SHALL authenticate users before allowing access to product management features
2. THE System SHALL filter User_System_Info queries by the authenticated user's userId
3. THE System SHALL filter Product_Template queries by the authenticated user's userId
4. WHEN a user attempts to modify another user's data, THE System SHALL deny the request and return an error
5. THE System SHALL log unauthorized access attempts
6. THE System SHALL support role-based access control for admin users to view all data

### Requirement 20: Testing and Quality Assurance

**User Story:** As a developer, I want comprehensive tests for the new features, so that I can ensure system reliability.

#### Acceptance Criteria

1. THE System SHALL include unit tests for UserSystemInfo model CRUD operations
2. THE System SHALL include unit tests for ProductTemplate model CRUD operations
3. THE System SHALL include integration tests for template-based sales workflows
4. THE System SHALL include tests for migration from existing inventory to new classification
5. THE System SHALL include round-trip property tests for data serialization and deserialization
6. FOR ALL product templates, parsing then printing then parsing SHALL produce an equivalent object
7. THE System SHALL achieve minimum 80% code coverage for new features
8. THE System SHALL include tests for error handling and validation scenarios
