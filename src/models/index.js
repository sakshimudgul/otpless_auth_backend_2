const User = require('./User');
const OTP = require('./OTP');


// Define associations
User.hasMany(OTP, { foreignKey: 'user_id' });
OTP.belongsTo(User, { foreignKey: 'user_id' });

module.exports = { User, OTP };