import { Column, DataType, Model, Table } from "sequelize-typescript";

/** "GARAŞYLÝAN" report: tourists expected to arrive, one row per group. */
@Table({
  tableName: 'tbl_inbound_expected',
  timestamps: true,
  // Every list, summary and export filters and orders by this date.
  indexes: [{ fields: ['start_date'] }],
})
export class InboundExpected extends Model<InboundExpected> {
  @Column({
    primaryKey: true,
    allowNull: false,
    defaultValue: DataType.UUIDV4,
    type: DataType.UUID
  })
  declare guid: string;

  @Column({
    type: DataType.INTEGER,
    autoIncrement: true,
    allowNull: false,
    unique: true
  })
  declare index_number: number;

  @Column({
    type: DataType.STRING,
    allowNull: false
  })
  declare country: string;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    defaultValue: 1
  })
  declare tourists_count: number;

  @Column({
    type: DataType.DATEONLY,
    allowNull: false
  })
  declare start_date: string;

  @Column({
    type: DataType.DATEONLY,
    allowNull: false
  })
  declare end_date: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true
  })
  declare route?: string;

  @Column({
    type: DataType.STRING,
    allowNull: true
  })
  declare transport?: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true
  })
  declare note?: string;
}
