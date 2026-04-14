const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");
const bcrypt = require("bcryptjs");

const User = sequelize.define(
  "User",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    username: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
      comment: "Username / 用户名",
    },
    email: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true,
      },
      comment: "Email / 邮箱",
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: "Encrypted Password / 加密密码",
    },
    role: {
      type: DataTypes.ENUM("user", "admin"),
      defaultValue: "user",
      comment: "Role / 角色",
    },
    status: {
      type: DataTypes.ENUM("active", "banned"),
      defaultValue: "active",
      comment: "Status / 状态",
    },
    nickname: {
      type: DataTypes.STRING(50),
      allowNull: true,
      comment: "Nickname / 昵称",
    },
    avatar: {
      type: DataTypes.STRING(500),
      allowNull: true,
      comment: "Avatar URL / 头像链接",
    },
    bio: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: "Bio / 简介",
    },
    preferred_lang: {
      type: DataTypes.STRING(10),
      allowNull: false,
      defaultValue: "zh",
      comment: "Preferred Language / 偏好语言 (zh, en)",
    },
  },
  {
    tableName: "users",
    timestamps: true,
    underscored: true,
    hooks: {
      beforeCreate: async (user) => {
        if (user.password) {
          user.password = await bcrypt.hash(user.password, 10);
        }
      },
      beforeUpdate: async (user) => {
        if (user.changed('password')) {
          user.password = await bcrypt.hash(user.password, 10);
        }
      },
    },
  },
);

User.prototype.validatePassword = async function (password) {
  return await bcrypt.compare(password, this.password);
};

module.exports = User;
