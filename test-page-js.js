const fs = require('fs');

// 读取HTML文件
const htmlContent = fs.readFileSync('./public/prototype-fixed.html', 'utf8');

// 提取JavaScript代码
const scriptMatch = htmlContent.match(/<script>([\s\S]*?)<\/script>/);

if (scriptMatch) {
    const jsCode = scriptMatch[1];
    
    // 检查常见的语法错误
    const errors = [];
    
    // 检查未闭合的括号
    const openBraces = (jsCode.match(/\{/g) || []).length;
    const closeBraces = (jsCode.match(/\}/g) || []).length;
    if (openBraces !== closeBraces) {
        errors.push(`大括号不匹配: ${openBraces} 个 '{' vs ${closeBraces} 个 '}'`);
    }
    
    const openParens = (jsCode.match(/\(/g) || []).length;
    const closeParens = (jsCode.match(/\)/g) || []).length;
    if (openParens !== closeParens) {
        errors.push(`圆括号不匹配: ${openParens} 个 '(' vs ${closeParens} 个 ')'`);
    }
    
    // 检查常见的语法错误模式
    if (jsCode.includes('});r>')) {
        errors.push('发现语法错误: });r>');
    }
    
    if (jsCode.includes('forEach((product, index) => {') && !jsCode.includes('});')) {
        errors.push('forEach循环可能没有正确闭合');
    }
    
    // 检查函数定义
    const functionDefs = jsCode.match(/function\s+\w+\s*\(/g) || [];
    console.log(`找到 ${functionDefs.length} 个函数定义:`);
    functionDefs.forEach(func => console.log(`  - ${func}`));
    
    if (errors.length > 0) {
        console.log('\n❌ 发现语法错误:');
        errors.forEach(error => console.log(`  - ${error}`));
    } else {
        console.log('\n✅ 基本语法检查通过');
    }
    
    // 检查关键函数是否存在
    const keyFunctions = [
        'loadAllData',
        'loadProducts',
        'displayRecognitionResult',
        'confirmReceivingFromForm',
        'updateSerialRequirement'
    ];
    
    console.log('\n检查关键函数:');
    keyFunctions.forEach(func => {
        const exists = jsCode.includes(`function ${func}`) || jsCode.includes(`${func} =`);
        console.log(`  - ${func}: ${exists ? '✅ 存在' : '❌ 缺失'}`);
    });
    
} else {
    console.log('❌ 未找到JavaScript代码');
}