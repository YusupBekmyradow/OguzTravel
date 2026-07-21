import { BelongsTo, Column, DataType, HasMany, Model, Table } from "sequelize-typescript";
import { Employee } from "../../employee/entities/employee.entity";
import { Translator } from "../../translator/entities/translator.entity";
import { Client } from "../../client/entities/client.entity";
import { TransPayment } from "../../trans_payment/entities/trans_payment.entity";

@Table({
  tableName: 'tbl_general_translations',
  timestamps: true
})
export class GeneralTranslation extends Model<GeneralTranslation> {
  @Column({
    primaryKey: true,
    allowNull: false,
    defaultValue: DataType.UUIDV4,
    type: DataType.UUID
  })
  declare guid: string;

  @Column({
    type: DataType.DATEONLY,
    allowNull: false
  })
  declare received_day: Date;

  @Column({
    type: DataType.TIME,
    allowNull: false
  })
  declare received_time: string;

  @Column({
    type: DataType.UUID,
    allowNull: false
  })
  declare opr_guid: string;

  @Column({
    type: DataType.INTEGER,
    allowNull: false
  })
  declare page_count: number;

  @Column({
    type: DataType.UUID,
    allowNull: false
  })
  declare client_guid: string;

  @Column({
    type: DataType.STRING,
    allowNull: false
  })
  declare source_to_target: string;

  @Column({
    type: DataType.TIME,
    allowNull: false
  })
  declare completed_time: string;

  @Column({
    type: DataType.STRING,
    allowNull: false,
    defaultValue: 'false'
  })
  declare status: string;

  @Column({
    type: DataType.INTEGER,
    allowNull: false
  })
  declare completed_page_count: number;

  @Column({
    type: DataType.DATEONLY,
    allowNull: false
  })
  declare completed_day: Date;

  @Column({
    type: DataType.UUID,
    allowNull: false
  })
  declare translator_guid: string;

  @Column({
    type: DataType.STRING,
    allowNull: false
  })
  declare correction_status: string;

  @Column({
    type: DataType.DECIMAL(12, 2),
    defaultValue: 0
  })
  declare price: number;

  @Column({
    type: DataType.INTEGER,
    autoIncrement: true,
    allowNull: false,
    unique: true
  })
  declare index_number: number;

  @Column({
    type: DataType.TEXT,
    allowNull: true
  })
  declare note?: string;

  @Column({
    type: DataType.BOOLEAN,
    allowNull: false,
    defaultValue: false
  })
  declare is_paid: boolean;


  @BelongsTo(() => Employee, {
    foreignKey: 'opr_guid',
    targetKey: 'guid',
    onDelete: 'SET NULL',
    onUpdate: 'SET NULL'
  })
  declare operator: Employee;

  @BelongsTo(() => Client, {
    foreignKey: 'client_guid',
    targetKey: 'guid',
    onDelete: 'SET NULL',
    onUpdate: 'SET NULL'
  })
  declare client: Client;

  @BelongsTo(() => Translator, {
    foreignKey: 'translator_guid',
    targetKey: 'guid',
    onDelete: 'SET NULL',
    onUpdate: 'SET NULL'
  })
  declare translator: Translator;

  @HasMany(() => TransPayment, {
    foreignKey: 'translation_guid',
    sourceKey: 'guid',
    onDelete: 'SET NULL',
    onUpdate: 'SET NULL'
  })
  declare transPayment: TransPayment[];
}