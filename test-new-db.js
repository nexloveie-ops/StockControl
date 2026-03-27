const mongoose = require('mongoose');

const URI = 'mongodb+srv://lztech:Zz12341234@lztechserve.9qydb2t.mongodb.net/?appName=lztechserve';

console.log('🔌 测试连接:', URI);

mongoose.connect(URI)
  .then(() => {
    console.log('✅ 连接成功！');
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ 连接失败:', err.message);
    console.error('错误代码:', err.code);
    process.exit(1);
  });
