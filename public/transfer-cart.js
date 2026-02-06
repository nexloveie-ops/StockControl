// 调货购物车功能

// 调货购物车
let transferCart = [];

// 添加设备到调货清单（每个设备都有唯一的 IMEI/SN）
function addDeviceToTransferCart(item) {
  // 检查是否已经在购物车中
  const exists = transferCart.find(cartItem => cartItem._id === item._id);
  if (exists) {
    alert('该设备已在调货清单中');
    return;
  }
  
  // 添加到购物车
  transferCart.push({
    _id: item._id,
    inventoryId: item._id,
    merchantId: item.merchantId,
    productName: item.productName,
    brand: item.brand,
    model: item.model,
    color: item.color,
    serialNumber: item.serialNumber,
    imei: item.imei,
    condition: item.condition,
    quantity: 1, // 设备数量固定为1
    costPrice: item.costPrice,
    wholesalePrice: item.wholesalePrice,
    retailPrice: item.retailPrice,
    taxClassification: item.taxClassification || 'VAT_23', // 添加税务分类
    isDevice: true
  });
  
  updateTransferCart();
  alert(`已添加 ${item.productName} (SN: ${item.serialNumber || item.imei}) 到调货清单`);
}

// 添加配件到调货清单（可以选择数量）
function addAccessoryToTransferCart(item) {
  const quantity = prompt(`请输入调货数量（可用: ${item.quantity}）:`, '1');
  
  if (!quantity) return;
  
  const qty = parseInt(quantity);
  if (isNaN(qty) || qty < 1) {
    alert('请输入有效的数量');
    return;
  }
  
  if (qty > item.quantity) {
    alert(`库存不足，最多可调货 ${item.quantity} 件`);
    return;
  }
  
  // 检查购物车中是否已有该产品
  const existingItem = transferCart.find(cartItem => cartItem._id === item._id);
  
  if (existingItem) {
    const newQty = existingItem.quantity + qty;
    if (newQty > item.quantity) {
      alert(`库存不足，最多可调货 ${item.quantity} 件`);
      return;
    }
    existingItem.quantity = newQty;
  } else {
    transferCart.push({
      _id: item._id,
      inventoryId: item._id,
      merchantId: item.merchantId,
      productName: item.productName,
      brand: item.brand,
      model: item.model,
      color: item.color,
      barcode: item.barcode,
      quantity: qty,
      maxQuantity: item.quantity,
      costPrice: item.costPrice,
      wholesalePrice: item.wholesalePrice,
      retailPrice: item.retailPrice,
      taxClassification: item.taxClassification || 'VAT_23', // 添加税务分类
      isDevice: false
    });
  }
  
  updateTransferCart();
  alert(`已添加 ${qty} 件 ${item.productName} 到调货清单`);
}

// 更新调货购物车显示
function updateTransferCart() {
  const cartCount = transferCart.length;
  const cartTotal = transferCart.reduce((sum, item) => {
    // 使用批发价计算，这是调货的实际成本
    return sum + (item.wholesalePrice * item.quantity);
  }, 0);
  
  document.getElementById('transferCartCount').textContent = cartCount;
  document.getElementById('transferCartTotal').textContent = cartTotal.toFixed(2);
  
  if (transferCart.length === 0) {
    document.getElementById('transferCartItems').innerHTML = '<p style="color: #9ca3af; text-align: center; padding: 40px 0;">调货清单是空的</p>';
  } else {
    const html = transferCart.map((item, index) => `
      <div style="background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px; margin-bottom: 10px;">
        <div style="font-weight: 600; margin-bottom: 4px; color: #1f2937; font-size: 13px;">${item.productName}</div>
        <div style="font-size: 11px; color: #6b7280; margin-bottom: 8px;">
          商户: ${item.merchantId}
          ${item.serialNumber ? `<br>SN: ${item.serialNumber}` : ''}
          ${item.imei ? `<br>IMEI: ${item.imei}` : ''}
          ${item.condition ? `<br>成色: ${item.condition}` : ''}
        </div>
        <div style="display: flex; justify-content: space-between; align-items: center;">
          ${item.isDevice ? `
            <div style="font-size: 12px; color: #6b7280;">1 台</div>
          ` : `
            <div style="display: flex; align-items: center; gap: 8px;">
              <button onclick="decreaseTransferCartQuantity(${index})" style="width: 24px; height: 24px; background: #ef4444; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 16px; line-height: 1;">-</button>
              <span style="min-width: 30px; text-align: center; font-weight: 600; font-size: 13px;">${item.quantity}</span>
              <button onclick="increaseTransferCartQuantity(${index})" style="width: 24px; height: 24px; background: #10b981; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 16px; line-height: 1;">+</button>
            </div>
          `}
          <div style="font-weight: 600; color: #ef4444; font-size: 13px;">
            €${(item.wholesalePrice * item.quantity).toFixed(2)}
          </div>
        </div>
        <button onclick="removeFromTransferCart(${index})" style="width: 100%; margin-top: 8px; padding: 4px; background: #fee2e2; color: #ef4444; border: none; border-radius: 4px; cursor: pointer; font-size: 12px;">
          移除
        </button>
      </div>
    `).join('');
    
    document.getElementById('transferCartItems').innerHTML = html;
  }
}

// 增加配件数量
function increaseTransferCartQuantity(index) {
  const item = transferCart[index];
  if (item.isDevice) return; // 设备不能增加数量
  
  if (item.quantity < item.maxQuantity) {
    item.quantity++;
    updateTransferCart();
  } else {
    alert(`库存不足，最多可调货 ${item.maxQuantity} 件`);
  }
}

// 减少配件数量
function decreaseTransferCartQuantity(index) {
  const item = transferCart[index];
  if (item.isDevice) return; // 设备不能减少数量
  
  if (item.quantity > 1) {
    item.quantity--;
    updateTransferCart();
  }
}

// 从购物车移除
function removeFromTransferCart(index) {
  transferCart.splice(index, 1);
  updateTransferCart();
}

// 清空购物车
function clearTransferCart() {
  if (confirm('确定要清空调货清单吗？')) {
    transferCart = [];
    updateTransferCart();
  }
}

// 提交调货申请
async function submitTransferRequest() {
  if (transferCart.length === 0) {
    alert('调货清单是空的');
    return;
  }
  
  // 按商户分组
  const groupedByMerchant = {};
  transferCart.forEach(item => {
    if (!groupedByMerchant[item.merchantId]) {
      groupedByMerchant[item.merchantId] = [];
    }
    groupedByMerchant[item.merchantId].push(item);
  });
  
  // 如果有多个商户，需要分别处理
  const merchants = Object.keys(groupedByMerchant);
  if (merchants.length > 1) {
    alert(`调货清单中包含 ${merchants.length} 个商户的产品，将分别创建调货申请。`);
  }
  
  try {
    // 为每个商户创建调货申请
    for (const fromMerchantId of merchants) {
      const items = groupedByMerchant[fromMerchantId];
      
      // 获取调货信息
      const infoResponse = await fetch(`${API_BASE}/merchant/inventory/transfer/info?fromMerchantId=${fromMerchantId}&toMerchantId=${merchantId}`);
      const infoResult = await infoResponse.json();
      
      if (!infoResult.success) {
        alert(`获取 ${fromMerchantId} 的调货信息失败: ${infoResult.error}`);
        continue;
      }
      
      const transferInfo = infoResult.data;
      
      // 显示确认对话框并等待用户确认
      await showTransferConfirmDialog(items, transferInfo);
    }
  } catch (error) {
    console.error('提交调货申请失败:', error);
    alert('提交调货申请失败: ' + error.message);
  }
}

// 显示调货确认对话框
function showTransferConfirmDialog(items, transferInfo) {
  return new Promise((resolve) => {
    const modal = document.createElement('div');
    modal.id = 'transferConfirmModal';
    modal.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 10000;';
    
    const transferType = transferInfo.transferType;
    const isInternalTransfer = transferType === 'INTERNAL_TRANSFER';
    
    // 计算总金额 - 根据每个产品的税务分类计算
    let subtotal = 0;
    let totalVAT = 0;
    let hasMarginVAT = false;
    let hasMultipleTaxTypes = false;
    const taxTypes = new Set();
    
    items.forEach(item => {
      const price = isInternalTransfer ? item.costPrice : item.wholesalePrice;
      const itemSubtotal = price * item.quantity;
      subtotal += itemSubtotal;
      
      // 记录税务分类类型
      const taxClass = item.taxClassification || 'VAT_23';
      taxTypes.add(taxClass);
      
      if (!isInternalTransfer) {
        // 根据税务分类计算VAT
        if (taxClass === 'Margin VAT') {
          hasMarginVAT = true;
          // Margin VAT: 只对差价征税，这里无法准确计算，使用简化估算
          // 假设差价约为售价的30%，实际会在完成时准确计算
          const estimatedMargin = itemSubtotal * 0.3;
          const marginVAT = estimatedMargin * 0.23 / 1.23;
          totalVAT += marginVAT;
        } else if (taxClass === 'VAT_23') {
          totalVAT += itemSubtotal * 0.23;
        } else if (taxClass === 'VAT_13.5') {
          totalVAT += itemSubtotal * 0.135;
        } else if (taxClass === 'VAT_9') {
          totalVAT += itemSubtotal * 0.09;
        } else if (taxClass === 'VAT_0') {
          totalVAT += 0;
        }
      }
    });
    
    hasMultipleTaxTypes = taxTypes.size > 1;
    const totalAmount = subtotal + totalVAT;
    
    // 交易类型图标和颜色
    const typeIcon = isInternalTransfer ? '📦' : '💰';
    const typeColor = isInternalTransfer ? '#3b82f6' : '#10b981';
    const typeName = isInternalTransfer ? '内部调拨' : '公司间销售';
    const priceTypeName = isInternalTransfer ? '成本价' : '批发价';
    
    modal.innerHTML = `
      <div style="background: white; border-radius: 12px; padding: 30px; max-width: 700px; width: 90%; max-height: 80vh; overflow-y: auto; box-shadow: 0 10px 40px rgba(0,0,0,0.3);">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
          <h2 style="margin: 0; color: #333;">
            ${typeIcon} ${typeName}
          </h2>
          <button onclick="closeTransferConfirmDialog()" style="background: none; border: none; font-size: 24px; cursor: pointer; color: #999;">×</button>
        </div>
        
        <!-- 交易类型说明 -->
        <div style="background: ${typeColor}15; padding: 15px; border-radius: 8px; border-left: 4px solid ${typeColor}; margin-bottom: 20px;">
          <div style="font-size: 14px; color: ${typeColor}; font-weight: 600; margin-bottom: 8px;">
            ${isInternalTransfer ? '✅ 同一公司内部调拨' : '💼 不同公司间销售'}
          </div>
          <div style="font-size: 13px; color: #666;">
            ${isInternalTransfer 
              ? '这是内部调拨，将使用成本价，不会产生销售记录和发票。' 
              : '这是公司间销售，将使用批发价，完成后会自动生成销售发票。'}
          </div>
        </div>
        
        <!-- 公司信息 -->
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 20px;">
          <div style="background: #f9fafb; padding: 15px; border-radius: 8px;">
            <div style="font-size: 12px; color: #6b7280; margin-bottom: 5px;">调出方</div>
            <div style="font-weight: 600; color: #111827; margin-bottom: 3px;">${transferInfo.fromMerchantName}</div>
            <div style="font-size: 13px; color: #6b7280;">${transferInfo.fromCompany || '未设置公司信息'}</div>
          </div>
          <div style="background: #f9fafb; padding: 15px; border-radius: 8px;">
            <div style="font-size: 12px; color: #6b7280; margin-bottom: 5px;">调入方</div>
            <div style="font-weight: 600; color: #111827; margin-bottom: 3px;">${transferInfo.toMerchantName}</div>
            <div style="font-size: 13px; color: #6b7280;">${transferInfo.toCompany || '未设置公司信息'}</div>
          </div>
        </div>
        
        <!-- 产品列表 -->
        <div style="margin-bottom: 20px;">
          <h3 style="font-size: 16px; margin-bottom: 10px; color: #333;">产品清单 (${items.length} 件)</h3>
          <div style="max-height: 250px; overflow-y: auto; border: 1px solid #e5e7eb; border-radius: 8px;">
            <table style="width: 100%; border-collapse: collapse;">
              <thead style="background: #f9fafb; position: sticky; top: 0;">
                <tr>
                  <th style="padding: 10px; text-align: left; font-size: 13px; border-bottom: 1px solid #e5e7eb;">产品名称</th>
                  <th style="padding: 10px; text-align: center; font-size: 13px; border-bottom: 1px solid #e5e7eb;">序列号/IMEI</th>
                  ${!isInternalTransfer ? `<th style="padding: 10px; text-align: center; font-size: 13px; border-bottom: 1px solid #e5e7eb;">税务分类</th>` : ''}
                  <th style="padding: 10px; text-align: center; font-size: 13px; border-bottom: 1px solid #e5e7eb;">数量</th>
                  <th style="padding: 10px; text-align: right; font-size: 13px; border-bottom: 1px solid #e5e7eb;">${priceTypeName}</th>
                  <th style="padding: 10px; text-align: right; font-size: 13px; border-bottom: 1px solid #e5e7eb;">小计</th>
                </tr>
              </thead>
              <tbody>
                ${items.map(item => {
                  const price = isInternalTransfer ? item.costPrice : item.wholesalePrice;
                  const itemTotal = price * item.quantity;
                  const taxClass = item.taxClassification || 'VAT_23';
                  
                  // 税务分类显示样式
                  let taxBadgeColor = '#3b82f6';
                  let taxBadgeText = taxClass;
                  if (taxClass === 'Margin VAT') {
                    taxBadgeColor = '#f59e0b';
                    taxBadgeText = 'Margin';
                  } else if (taxClass === 'VAT_0') {
                    taxBadgeColor = '#10b981';
                    taxBadgeText = '0%';
                  } else if (taxClass === 'VAT_13.5') {
                    taxBadgeColor = '#6366f1';
                    taxBadgeText = '13.5%';
                  } else if (taxClass === 'VAT_23') {
                    taxBadgeColor = '#3b82f6';
                    taxBadgeText = '23%';
                  }
                  
                  return `
                    <tr>
                      <td style="padding: 10px; font-size: 13px; border-bottom: 1px solid #f3f4f6;">${item.productName}</td>
                      <td style="padding: 10px; text-align: center; font-size: 11px; font-family: monospace; border-bottom: 1px solid #f3f4f6;">${item.serialNumber || item.imei || '-'}</td>
                      ${!isInternalTransfer ? `
                        <td style="padding: 10px; text-align: center; border-bottom: 1px solid #f3f4f6;">
                          <span style="background: ${taxBadgeColor}20; color: ${taxBadgeColor}; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 600;">${taxBadgeText}</span>
                        </td>
                      ` : ''}
                      <td style="padding: 10px; text-align: center; font-size: 13px; border-bottom: 1px solid #f3f4f6;">${item.quantity}</td>
                      <td style="padding: 10px; text-align: right; font-size: 13px; font-weight: 600; border-bottom: 1px solid #f3f4f6;">€${price.toFixed(2)}</td>
                      <td style="padding: 10px; text-align: right; font-size: 13px; font-weight: 600; border-bottom: 1px solid #f3f4f6;">€${itemTotal.toFixed(2)}</td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>
        
        <!-- 金额汇总 -->
        <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
            <span style="color: #6b7280;">小计:</span>
            <span style="font-weight: 600;">€${subtotal.toFixed(2)}</span>
          </div>
          ${!isInternalTransfer ? `
            <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
              <span style="color: #6b7280;">VAT ${hasMultipleTaxTypes ? '(混合税率)' : ''}:</span>
              <span style="font-weight: 600;">€${totalVAT.toFixed(2)}</span>
            </div>
            ${hasMarginVAT ? `
              <div style="background: #fef3c7; padding: 8px; border-radius: 4px; margin-bottom: 10px; font-size: 12px; color: #92400e;">
                ⚠️ 包含Margin VAT产品，VAT为估算值，实际金额将根据差价计算
              </div>
            ` : ''}
          ` : ''}
          <div style="display: flex; justify-content: space-between; padding-top: 10px; border-top: 2px solid #e5e7eb;">
            <span style="font-size: 18px; font-weight: 600; color: #111827;">总计${!isInternalTransfer && (hasMarginVAT || hasMultipleTaxTypes) ? ' (估算)' : ''}:</span>
            <span style="font-size: 20px; font-weight: 700; color: ${typeColor};">€${totalAmount.toFixed(2)}</span>
          </div>
        </div>
        
        <!-- 备注 -->
        <div style="margin-bottom: 20px;">
          <label style="display: block; margin-bottom: 8px; font-weight: 600; color: #333;">备注（可选）</label>
          <textarea id="transferNotes" rows="3" style="width: 100%; padding: 10px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 14px; resize: vertical;" placeholder="输入备注信息..."></textarea>
        </div>
        
        <!-- 按钮 -->
        <div style="display: flex; gap: 10px;">
          <button onclick="closeTransferConfirmDialog()" style="flex: 1; padding: 12px; background: #e5e7eb; color: #374151; border: none; border-radius: 6px; cursor: pointer; font-weight: 600; font-size: 15px;">
            取消
          </button>
          <button onclick="confirmTransferRequest()" style="flex: 1; padding: 12px; background: ${typeColor}; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 600; font-size: 15px;">
            ${isInternalTransfer ? '✅ 确认调货' : '💰 确认购买'}
          </button>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    // 保存数据到全局变量
    window.currentTransferData = {
      items: items,
      transferInfo: transferInfo,
      isInternalTransfer: isInternalTransfer,
      resolve: resolve
    };
  });
}

// 关闭调货确认对话框
function closeTransferConfirmDialog() {
  const modal = document.getElementById('transferConfirmModal');
  if (modal) {
    modal.remove();
  }
  if (window.currentTransferData && window.currentTransferData.resolve) {
    window.currentTransferData.resolve();
  }
  window.currentTransferData = null;
}

// 确认调货请求
async function confirmTransferRequest() {
  if (!window.currentTransferData) {
    alert('调货数据丢失，请重试');
    return;
  }
  
  const { items, transferInfo } = window.currentTransferData;
  const notes = document.getElementById('transferNotes').value;
  
  try {
    // 准备请求数据
    const requestData = {
      fromMerchantId: transferInfo.fromMerchantId,
      toMerchantId: merchantId,
      items: items.map(item => ({
        inventoryId: item.inventoryId,
        quantity: item.quantity
      })),
      notes: notes
    };
    
    console.log('发起调货请求:', requestData);
    
    const response = await fetch(`${API_BASE}/merchant/inventory/transfer/request`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestData)
    });
    
    const result = await response.json();
    console.log('调货请求响应:', result);
    
    if (result.success) {
      closeTransferConfirmDialog();
      
      // 从购物车中移除已提交的产品
      items.forEach(submittedItem => {
        const index = transferCart.findIndex(cartItem => cartItem._id === submittedItem._id);
        if (index !== -1) {
          transferCart.splice(index, 1);
        }
      });
      updateTransferCart();
      
      // 显示成功消息
      const transferType = result.data.transferType;
      const message = transferType === 'INTERNAL_TRANSFER' 
        ? `内部调拨申请已提交！\n\n调货单号: ${result.data.transferNumber}\n等待对方审批` 
        : `公司间销售订单已创建！\n\n订单号: ${result.data.transferNumber}\n等待对方审批`;
      
      alert(message);
      
      // 刷新群组库存
      loadGroupInventory();
    } else {
      alert('调货申请失败: ' + (result.error || '未知错误'));
    }
  } catch (error) {
    console.error('调货申请失败:', error);
    alert('调货申请失败: ' + error.message);
  }
}
