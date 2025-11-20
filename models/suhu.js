const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('suhu', {
    id: {
      autoIncrement: true,
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true
    },
    humidity: {
      type: DataTypes.STRING(5),
      allowNull: false
    }
  }, {
    sequelize,
    tableName: 'suhu',
    timestamps: true,
    indexes: [
      {
        name: "PRIMARY",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "id" },
        ]
      },
      {
        name: "idx_suhu_createdat",
        using: "BTREE",
        fields: [
          { name: "createdAt" },
        ]
      },
      {
        name: "idx_suhu_humidity",
        using: "BTREE",
        fields: [
          { name: "humidity" },
        ]
      },
    ]
  });
};
