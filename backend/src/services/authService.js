const { User } = require('../models');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

class AuthService {
  async register(data) {
    const { username, email, password } = data;
    
    const existingUser = await User.findOne({ where: { username } });
    if (existingUser) {
      throw new Error('user_exists'); // Will be caught by controller
    }

    const user = await User.create({ username, email, password });
    const userData = user.toJSON();
    delete userData.password;
    
    return userData;
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
