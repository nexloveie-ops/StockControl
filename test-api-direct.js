const http = require('http');

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/admin/suppliers/69852601b9f253cade6e4c43/invoices',
  method: 'GET'
};

const req = http.request(options, (res) => {
  let data = '';
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    const result = JSON.parse(data);
    if (result.success && result.data.length > 0) {
      const inv = result.data[0];
      console.log('Invoice:', inv.invoiceNumber);
      console.log('Subtotal:', inv.subtotal);
      console.log('TaxAmount:', inv.taxAmount);
      console.log('TotalAmount:', inv.totalAmount);
      console.log('Items:', inv.items?.length);
      console.log('AdminInventoryCount:', inv.adminInventoryCount);
      console.log('PurchaseInvoiceCount:', inv.purchaseInvoiceCount);
      console.log('Supplier type:', typeof inv.supplier);
      console.log('Supplier:', inv.supplier);
    }
  });
});

req.on('error', (error) => {
  console.error('Error:', error);
});

req.end();
