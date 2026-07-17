import { BelongsTo, Column, DataType, Model, Table } from "sequelize-typescript";
import { Employee } from "../../employee/entities/employee.entity";
import { TransStatus } from "../../../trans_status/entities/trans_status.entity";
import { Translator } from "../../../translator/entities/translator.entity";

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
  declare received_date: Date;

  @Column({
    type: DataType.TIME,
    allowNull: false
  })
  declare received_time: string;

  // @Column({
  //   type: DataType.UUID,
  //   allowNull: false
  // })
  // declare opr_guid: string;

  @Column({
    type: DataType.INTEGER,
    allowNull: false
  })
  declare page_count: number;

  // @Column({
  //   type: DataType.STRING,
  //   allowNull: false
  // })
  // declare client_guid: string;

  @Column({
    type: DataType.STRING,
    allowNull: false
  })
  declare translation_direction: string;

  @Column({
    type: DataType.TIME,
    allowNull: true
  })
  declare completed_time: string;

  // @Column({
  //   type: DataType.UUID,
  //   allowNull: false
  // })
  // declare status_guid: string;

  @Column({
    type: DataType.INTEGER,
    allowNull: true
  })
  declare completed_page_count: number;

  @Column({
    type: DataType.DATEONLY,
    allowNull: true
  })
  declare completed_date: Date;

  // @Column({
  //   type: DataType.UUID,
  //   allowNull: true
  // })
  // declare translator_guid: string;

  @Column({
    type: DataType.STRING,
    allowNull: true
  })
  declare correction_status: string;

  @Column({
    type: DataType.DECIMAL(10, 2),
    defaultValue: 0
  })
  declare price: number;

  // @BelongsTo(() => Employee, {
  //   foreignKey: 'opr_guid',
  //   targetKey: 'guid'
  // })
  // declare operator: Employee;

  // client

  // @BelongsTo(() => TransStatus, { 
  //   foreignKey: 'status_guid', 
  //   targetKey: 'guid' })
  // declare status: TransStatus;

  // @BelongsTo(() => Translator, { 
  //   foreignKey: 'translator_guid',
  //   targetKey: 'guid' })
  // declare translator: Translator;
}