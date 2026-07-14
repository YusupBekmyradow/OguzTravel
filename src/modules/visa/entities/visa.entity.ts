import { Table, Model, Column, DataType, BelongsTo } from "sequelize-typescript";
import { Client } from "../../client/entities/client.entity";

@Table({
  tableName: 'tbl_visa',
  timestamps: true
})

export class Visa extends Model<Visa> {
  @Column({
    primaryKey: true,
    allowNull: false,
    defaultValue: DataType.UUIDV4,
    type: DataType.UUID
  })
  declare guid: string;

  @Column({
    type: DataType.STRING,
    allowNull: false,
    unique: true
  })
  declare index_number: string;

  @Column({
    type: DataType.DATE,
    allowNull: false
  })
  declare datetime: Date;

  @Column({
    type: DataType.UUID,
    allowNull: false
  })
  declare client_guid: string;

  @Column({
    type: DataType.JSONB,
    allowNull: true,
    defaultValue: { phone: null, name: null }
  })
  declare agent: {
    name: string,
    phone_number: string
  };

  @Column({
    type: DataType.STRING,
    allowNull: true
  })
  declare service: string;

  @Column({
    type: DataType.STRING,
    allowNull: true
  })
  declare hotel_booking: string;

  @Column({
    type: DataType.STRING,
    allowNull: true
  })
  declare translation: string;

  @Column({
    type: DataType.DECIMAL(12, 2),
    defaultValue: 0
  })
  declare total_price: number;

  @Column({
    type: DataType.STRING,
    allowNull: false,
    defaultValue: 'USD'
  })
  declare currency: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true
  })
  declare note?: string;

  @BelongsTo(() => Client, {
    targetKey: 'guid',
    foreignKey: 'client_guid'
  })
  declare client: Client;
  
}
