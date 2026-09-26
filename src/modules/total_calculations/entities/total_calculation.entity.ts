import { Model, Column, DataType, Table, BelongsTo } from "sequelize-typescript";
import { Employee } from "../../employee/entities/employee.entity";
import { Office } from "../../office/entities/office.entity";
import { Category } from "../../category/entities/category.entity";

@Table({
  tableName: 'tbl_total_calculations',
  timestamps: true
})
export class TotalCalculation extends Model<TotalCalculation> {
  @Column({
    primaryKey: true,
    allowNull: false,
    defaultValue: DataType.UUIDV4,
    type: DataType.UUID
  })
  declare guid: string;

  @Column({
    type: DataType.UUID,
    allowNull: true,
  })
  declare category_guid?: string;

  @Column({
    type: DataType.DATE,
    allowNull: false,
    defaultValue: DataType.NOW
  })
  declare datetime: Date;

  @Column({
    type: DataType.UUID,
    allowNull: true
  })
  declare receiver_opr_guid?: string;

  @Column({
    type: DataType.UUID,
    allowNull: true
  })
  declare office_guid?: string;

  @Column({
    type: DataType.STRING,
    allowNull: true
  })
  declare status?: string;

  @Column({
    type: DataType.DECIMAL(12, 2),
    allowNull: false,
    defaultValue: 0
  })
  declare net_price: number;

  @Column({
    type: DataType.DECIMAL(12, 2),
    allowNull: true,
    defaultValue: 0
  })
  declare sale_price: number;

  @Column({
    type: DataType.STRING,
    allowNull: false,
    defaultValue: 'USD'
  })
  declare currency: string;

  @Column({
    type: DataType.DECIMAL(12, 2),
    allowNull: true,
    defaultValue: 0
  })
  declare profit: number;

  @Column({
    type: DataType.DECIMAL(12, 2),
    allowNull: true,
    defaultValue: 0
  })
  declare credit_price: number;

  // USD sale price — used for dual-currency modules (e.g. Visa)
  @Column({
    type: DataType.DECIMAL(12, 2),
    allowNull: true,
    defaultValue: 0
  })
  declare sale_price_usd: number;

  // USD credit (paid amount) — used for dual-currency modules (e.g. Visa)
  @Column({
    type: DataType.DECIMAL(12, 2),
    allowNull: true,
    defaultValue: 0
  })
  declare credit_usd: number;

  @Column({
    type: DataType.BOOLEAN,
    allowNull: false,
    defaultValue: false
  })
  declare is_manual: boolean;

  @Column({
    type: DataType.INTEGER,
    autoIncrement: true,
    allowNull: false,
    unique: true
  })
  declare index_number: number;

  // INCOME | EXPENSE — direction for cash-ledger rows (manual / Excel).
  // Project (trigger) rows leave it null and use sale_price / net_price.
  @Column({
    type: DataType.STRING(20),
    allowNull: true
  })
  declare type?: string;

  // PROJECT (DB triggers) | MANUAL (added from UI) | EXCEL (imported kassa book)
  @Column({
    type: DataType.STRING(20),
    allowNull: true,
    defaultValue: 'PROJECT'
  })
  declare source?: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true
  })
  declare description?: string;

  // Free-text "Tabşyran" / "Kabul eden" from the kassa book
  @Column({
    type: DataType.STRING,
    allowNull: true
  })
  declare giver?: string;

  @Column({
    type: DataType.STRING,
    allowNull: true
  })
  declare receiver?: string;

  // "Kärhana üçin" (Oguztravel, Oguzabat, ...)
  @Column({
    type: DataType.STRING,
    allowNull: true
  })
  declare company?: string;

  // Deterministic key of an imported Excel row; a unique index prevents re-importing it.
  @Column({
    type: DataType.STRING(64),
    allowNull: true
  })
  declare import_key?: string;

  @BelongsTo(() => Employee, {
    foreignKey: 'receiver_opr_guid',
    targetKey: 'guid',
    as: 'receiver_operator',
    onDelete: 'SET NULL',
    onUpdate: 'SET NULL'
  })
  declare receiver_operator?: Employee;

  @BelongsTo(() => Office, {
    foreignKey: 'office_guid',
    targetKey: 'guid',
    as: 'office',
    onDelete: 'SET NULL',
    onUpdate: 'SET NULL'
  })
  declare office?: Office;

  @BelongsTo(() => Category, {
    foreignKey: 'category_guid',
    targetKey: 'guid',
    as: 'category',
    onDelete: 'SET NULL',
    onUpdate: 'SET NULL'
  })
  declare category?: Category;
}