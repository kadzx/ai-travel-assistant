const { User } = require('../models');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

class AuthService {
  async register(data) {
    const { username, email, password } = data;
    
    // Check if username OR email exists
    const existingUser = await User.findOne({ 
      where: { 
        [require('sequelize').Op.or]: [{ username }, { email }] 
      } 
    });
    
    if (existingUser) {
      throw new Error('user_exists'); 
    }

    // Hash password is done in Model hook
    const user = await User.create({ username, email, password });
    
    // Generate token for immediate login after registration
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

  async login(email, password) {
    const user = await User.findOne({ where: { email } });
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
}

module.exports = new AuthService();
