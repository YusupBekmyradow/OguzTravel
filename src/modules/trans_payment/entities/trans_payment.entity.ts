import { Model, Column, DataType, BelongsTo, Table } from "sequelize-typescript";
import { GeneralTranslation } from "../../general_translation/entities/general_translation.entity";
import { Employee } from "../../employee/entities/employee.entity";

@Table({
  tableName: 'tbl_trans_payments',
  timestamps: true
})

export class TransPayment extends Model<TransPayment> {
  @Column({
    primaryKey: true,
    allowNull: false,
    defaultValue: DataType.UUIDV4,
    type: DataType.UUID
  })
  declare guid: string;

  @Column({
    type: DataType.DECIMAL(12, 2),
    allowNull: false,
    defaultValue: 0
  })
  declare amount: number;

  @Column({
    type: DataType.UUID,
    allowNull: false
  })
  declare translation_guid: string;

  @Column({
    type: DataType.DATE,
    allowNull: false
  })
  declare payment_date: Date;

  @Column({
    type: DataType.TEXT,
    allowNull: true
  })
  declare note?: string;

  @Column({
    type: DataType.UUID,
    allowNull: false
  })
  declare opr_guid: string;

  @Column({
    type: DataType.INTEGER,
    autoIncrement: true,
    allowNull: false,
    unique: true
  })
  declare index_number: number;

  @BelongsTo(() => GeneralTranslation, {
    targetKey: 'guid',
    foreignKey: 'translation_guid'
  })
  declare generalTranslation: GeneralTranslation;

  @BelongsTo(() => Employee, {
    targetKey: 'guid',
    foreignKey: 'opr_guid',
    as: 'transoperator',
  })
  declare operator: Employee;

}
