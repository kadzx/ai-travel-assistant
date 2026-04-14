const { User } = require('../models');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

class AuthService {
  async register(data) {
    const { username, email, password } = data;
    
    const existingUser = await User.findOne({ 
      where: { 
        [require('sequelize').Op.or]: [{ username }, { email }] 
      } 
    });
    
    if (existingUser) {
      throw new Error('user_exists'); 
    }

    const user = await User.create({ username, email, password });
    
    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: process.env.JWT_EXPIRES_IN || '1d' }
    );

    const userData = user.toJSON();
    delete userData.password;
    
    return {
      user: userData,
      token
    };
  }

  async login(identifier, password) {
    const { Op } = require('sequelize');
    const user = await User.findOne({ 
      where: { 
        [Op.or]: [{ email: identifier }, { username: identifier }]
      } 
    });
    if (!user) throw new Error('user_not_found');

    const isMatch = await user.validatePassword(password);
    if (!isMatch) throw new Error('password_error');

    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: process.env.JWT_EXPIRES_IN || '1d' }
    );

    return { 
      token, 
      user: { id: user.id, username: user.username, role: user.role } 
    };
  }

  async verifyEmail(email) {
    const user = await User.findOne({ where: { email } });
    if (!user) throw new Error('user_not_found');
    return { userId: user.id, email: user.email, username: user.username };
  }

  async resetPassword(email, newPassword) {
    const user = await User.findOne({ where: { email } });
    if (!user) throw new Error('user_not_found');
    const hashed = await bcrypt.hash(newPassword, 10);
    user.password = hashed;
    await user.save({ hooks: false });
    return { success: true };
  }
}

module.exports = new AuthService();
