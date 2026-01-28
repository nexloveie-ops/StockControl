// 简单的用户注册测试
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// 用户模型
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['admin', 'manager', 'staff'], default: 'staff' }
}, { timestamps: true });

// 密码加密
userSchema.pre('save', async function() {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, 12);
});

const User = mongoose.model('TestUser', userSchema);

async function testUserRegistration() {
  try {
    // 连接数据库
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('数据库连接成功');

    // 创建测试用户
    const testUser = new User({
      username: 'testadmin',
      email: 'test@example.com',
      password: '123456',
      role: 'admin'
    });

    const savedUser = await testUser.save();
    console.log('用户创建成功:', {
      id: savedUser._id,
      username: savedUser.username,
      email: savedUser.email,
      role: savedUser.role
    });

    // 验证密码加密
    const isPasswordHashed = savedUser.password !== '123456';
    console.log('密码已加密:', isPasswordHashed);

    // 清理测试数据
    await User.deleteOne({ _id: savedUser._id });
    console.log('测试数据已清理');

  } catch (error) {
    console.error('测试失败:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('数据库连接已关闭');
  }
}

testUserRegistration();