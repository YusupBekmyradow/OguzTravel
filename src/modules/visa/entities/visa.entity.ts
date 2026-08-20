import { Table, Model, Column, DataType, BelongsTo, HasMany } from "sequelize-typescript";
import { Client } from "../../client/entities/client.entity";
import { Employee } from "../../employee/entities/employee.entity";

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

  declare passport_count: number;

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
    type: DataType.UUID,
    allowNull: true
  })
  declare client_guid: string;

  @Column({
    type: DataType.UUID,
    allowNull: true
  })
  declare receiver_opr_guid: string;

  @Column({
    type: DataType.DECIMAL(12, 2),
    defaultValue: 0
  })
  declare price_tmt: number;

  @Column({
    type: DataType.DECIMAL(12, 2),
    defaultValue: 0
  })
  declare price_usd: number;

  @Column({
    type: DataType.TEXT,
    allowNull: true
  })
  declare note?: string;

  //is_paid

  @BelongsTo(() => Client, {
    targetKey: 'guid',
    foreignKey: 'client_guid',
    onDelete: 'SET NULL',
    onUpdate: 'SET NULL'
  })
  declare client: Client;


  @BelongsTo(() => Employee, {
    targetKey: 'guid',
    foreignKey: 'receiver_opr_guid',
    as: 'receiveroperator',
    onDelete: 'SET NULL',
    onUpdate: 'SET NULL'
  })
  declare receiver_operator: Employee;
}
