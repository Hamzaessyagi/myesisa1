const { Sequelize } = require('sequelize');
require('dotenv').config();

// Configuration de la base de données
const sequelize = new Sequelize(
  process.env.DB_NAME || 'myesisa_db',
  process.env.DB_USER || 'root',
  process.env.DB_PASSWORD || '',
  {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    dialect: 'mysql',
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    },
    timezone: '+01:00', // Fuseau horaire du Maroc
    define: {
      charset: 'utf8mb4',
      collate: 'utf8mb4_unicode_ci',
      timestamps: true,
      underscored: true,
      freezeTableName: true
    }
  }
);

// Test de connexion
async function testConnection() {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connection has been established successfully.');
    return true;
  } catch (error) {
    console.error('❌ Unable to connect to the database:', error);
    return false;
  }
}

// Connexion et synchronisation
async function connectDB() {
  try {
    await testConnection();
    
    // Import des modèles
    const User = require('../models/User');
    const Course = require('../models/Course');
    const Grade = require('../models/Grade');
    const Attendance = require('../models/Attendance');
    const Schedule = require('../models/Schedule');
    const Material = require('../models/Material');
    
    // Définition des associations
    defineAssociations();
    
    // Synchronisation des modèles
    if (process.env.NODE_ENV === 'development') {
      await sequelize.sync({ alter: true });
      console.log('✅ Database synchronized successfully');
    } else {
      await sequelize.sync();
    }
    
    return sequelize;
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    throw error;
  }
}

// Définition des associations entre modèles
function defineAssociations() {
  const User = require('../models/User');
  const Course = require('../models/Course');
  const Grade = require('../models/Grade');
  const Attendance = require('../models/Attendance');
  const Schedule = require('../models/Schedule');
  const Material = require('../models/Material');
  
  // Relations User-Course
  User.hasMany(Course, { 
    foreignKey: 'teacher_id', 
    as: 'teacherCourses',
    onDelete: 'SET NULL'
  });
  Course.belongsTo(User, { 
    foreignKey: 'teacher_id', 
    as: 'teacher' 
  });
  
  // Relations User-Grade (Student)
  User.hasMany(Grade, { 
    foreignKey: 'student_id', 
    as: 'studentGrades',
    onDelete: 'CASCADE'
  });
  Grade.belongsTo(User, { 
    foreignKey: 'student_id', 
    as: 'student' 
  });
  
  // Relations Course-Grade
  Course.hasMany(Grade, { 
    foreignKey: 'course_id', 
    as: 'courseGrades',
    onDelete: 'CASCADE'
  });
  Grade.belongsTo(Course, { 
    foreignKey: 'course_id', 
    as: 'course' 
  });
  
  // Relations User-Attendance
  User.hasMany(Attendance, { 
    foreignKey: 'student_id', 
    as: 'studentAttendances',
    onDelete: 'CASCADE'
  });
  Attendance.belongsTo(User, { 
    foreignKey: 'student_id', 
    as: 'student' 
  });
  
  // Relations Course-Attendance
  Course.hasMany(Attendance, { 
    foreignKey: 'course_id', 
    as: 'courseAttendances',
    onDelete: 'CASCADE'
  });
  Attendance.belongsTo(Course, { 
    foreignKey: 'course_id', 
    as: 'course' 
  });
  
  // Relations Course-Schedule
  Course.hasMany(Schedule, { 
    foreignKey: 'course_id', 
    as: 'courseSchedules',
    onDelete: 'CASCADE'
  });
  Schedule.belongsTo(Course, { 
    foreignKey: 'course_id', 
    as: 'course' 
  });
  
  // Relations Course-Material
  Course.hasMany(Material, { 
    foreignKey: 'course_id', 
    as: 'courseMaterials',
    onDelete: 'CASCADE'
  });
  Material.belongsTo(Course, { 
    foreignKey: 'course_id', 
    as: 'course' 
  });
  
  // Relations User-Material (Teacher)
  User.hasMany(Material, { 
    foreignKey: 'teacher_id', 
    as: 'teacherMaterials',
    onDelete: 'CASCADE'
  });
  Material.belongsTo(User, { 
    foreignKey: 'teacher_id', 
    as: 'teacher' 
  });
}

// Fermeture de la connexion
async function closeConnection() {
  try {
    await sequelize.close();
    console.log('🔒 Database connection closed.');
  } catch (error) {
    console.error('❌ Error closing database connection:', error);
  }
}

module.exports = {
  sequelize,
  connectDB,
  closeConnection,
  testConnection
};