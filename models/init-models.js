var DataTypes = require("sequelize").DataTypes;
var _setting = require("./setting");
var _suhu = require("./suhu");
var _users = require("./users");

function initModels(sequelize) {
  var setting = _setting(sequelize, DataTypes);
  var suhu = _suhu(sequelize, DataTypes);
  var users = _users(sequelize, DataTypes);


  return {
    setting,
    suhu,
    users,
  };
}
module.exports = initModels;
module.exports.initModels = initModels;
module.exports.default = initModels;
