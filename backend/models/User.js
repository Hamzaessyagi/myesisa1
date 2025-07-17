const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');
const bcrypt = require('bcrypt');

const User = sequelize.define('User', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  email: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true,
    validate: {
      isEmail: {
        msg: 'Must be a valid email address'
      }
    }
  },
  password: {
    type: DataTypes.STRING(255),
    allowNull: false,
    validate: {
      len: {
        args: [6, 255],
        msg: 'Password must be at least 6 characters long'
      }
    }
  },
  first_name: {
    type: DataTypes.STRING(50),
    allowNull: false,
    validate: {
      len: {
        args: [2, 50],
        msg: 'First name must be between 2 and 50 characters'
      }
    }
  },
  last_name: {
    type: DataTypes.STRING(50),
    allowNull: false,
    validate: {
      len: {
        args: [2, 50],
        msg: 'Last name must be between 2 and 50 characters'
      }
    }
  },
  role: {
    type: DataTypes.ENUM('admin', 'teacher', 'student'),
    allowNull: false,
    defaultValue: 'student'
  },
  student_id: {
    type: DataTypes.STRING(20),
    allowNull: true,
    unique: true,
    validate: {
      isStudentIdValid(value) {
        if (this.role === 'student' && !value) {
          throw new Error('Student ID is required for students');
        }
        if (this.role !== 'student' && value) {
          throw new Error('Student ID should only be provided for students');
        }
      }
    }
  },
  phone: {
    type: DataTypes.STRING(20),
    allowNull: true,
    validate: {
      is: {
        args: /^[+]?[0-9\s\-\(\)]+$/,
        msg: 'Phone number format is invalid'
      }
    }
  },
  date_of_birth: {
    type: DataTypes.DATEONLY,
    allowNull: true,
    validate: {
      isDate: {
        msg: 'Date of birth must be a valid date'
      },
      isBefore: {
        args: new Date().toISOString().split('T')[0],
        msg: 'Date of birth cannot be in the future'
      }
    }
  },
  address: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  profile_picture: {
    type: DataTypes.STRING(255),
    allowNull: true,
    validate: {
      isUrl: {
        msg: 'Profile picture must be a valid URL'
      }
    }
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    allowNull: false
  },
  last_login: {
    type: DataTypes.DATE,
    allowNull: true
  },
  email_verified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    allowNull: false
  },
  email_verification_token: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  password_reset_token: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  password_reset_expires: {
    type: DataTypes.DATE,
    allowNull: true
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    allowNull: false
  },
  updated_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    allowNull: false
  }
}, {
  tableName: 'users',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      unique: true,
      fields: ['email']
    },
    {
      unique: true,
      fields: ['student_id']
    },
    {
      fields: ['role']
    },
    {
      fields: ['is_active']
    }
  ]
});

// Hooks pour le hachage du mot de passe
User.beforeCreate(async (user) => {
  if (user.password) {
    const saltRounds = 12;
    user.password = await bcrypt.hash(user.password, saltRounds);
  }
});

User.beforeUpdate(async (user) => {
  if (user.changed('password')) {
    const saltRounds = 12;
    user.password = await bcrypt.hash(user.password, saltRounds);
  }
});

// Méthodes d'instance
User.prototype.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

User.prototype.toJSON = function() {
  const values = Object.assign({}, this.get());
  delete values.password;
  delete values.email_verification_token;
  delete values.password_reset_token;
  delete values.password_reset_expires;
  return values;
};

User.prototype.getFullName = function() {
  return `${this.first_name} ${this.last_name}`;
};

User.prototype.updateLastLogin = async function() {
  this.last_login = new Date();
  await this.save();
};

// Méthodes statiques
User.findByEmail = async function(email) {
  return this.findOne({ where: { email } });
};

User.findByStudentId = async function(studentId) {
  return this.findOne({ where: { student_id: studentId } });
};

User.findActiveUsers = async function() {
  return this.findAll({ where: { is_active: true } });
};

User.findByRole = async function(role) {
  return this.findAll({ where: { role } });
};

User.createUser = async function(userData) {
  try {
    const user = await this.create(userData);
    return user;
  } catch (error) {
    throw error;
  }
};

User.updateUser = async function(id, updateData) {
  try {
    const [affectedCount] = await this.update(updateData, {
      where: { id }
    });
    
    if (affectedCount === 0) {
      throw new Error('User not found');
    }
    
    return this.findByPk(id);
  } catch (error) {
    throw error;
  }
};

User.deleteUser = async function(id) {
  try {
    const deletedCount = await this.destroy({
      where: { id }
    });
    
    if (deletedCount === 0) {
      throw new Error('User not found');
    }
    
    return { message: 'User deleted successfully' };
  } catch (error) {
    throw error;
  }
};

User.searchUsers = async function(query) {
  const { Op } = require('sequelize');
  
  return this.findAll({
    where: {
      [Op.or]: [
        { first_name: { [Op.like]: `%${query}%` } },
        { last_name: { [Op.like]: `%${query}%` } },
        { email: { [Op.like]: `%${query}%` } },
        { student_id: { [Op.like]: `%${query}%` } }
      ]
    },
    order: [['created_at', 'DESC']]
  });
};

module.exports = User;