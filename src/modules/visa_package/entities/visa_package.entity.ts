import { Table, Model, Column, DataType, BelongsTo } from "sequelize-typescript";
import { VisaCategory } from "../../visa_category/entities/visa_category.entity";


@Table({
  tableName: 'tbl_visa_package',
  timestamps: true
})

export class VisaPackage extends Model<VisaPackage> {
  @Column({
    primaryKey: true,
    allowNull: false,
    defaultValue: DataType.UUIDV4,
    type: DataType.UUID
  })
  declare guid: string;

  @Column({
    type: DataType.STRING,
    allowNull: false
  })
  declare name: string;

  @Column({
    type: DataType.UUID,
    allowNull: false
  })
  declare category_guid: string;

  @Column({
    type: DataType.DECIMAL(10, 2),
    allowNull: false
  })
  declare price: number;

  @Column({
    type: DataType.INTEGER,
    allowNull: false
  })
  declare index_number: number;

  @Column({
    type: DataType.STRING,
    allowNull: false
  })
  declare table_type: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true
  })
  declare description: string;

  @Column({
    type: DataType.DECIMAL(10, 2),
    allowNull: true
  })
  declare sale_price: number;

  @Column({
    type: DataType.DATEONLY,
    allowNull: true
  })
  declare sale_start_date: Date;

  @Column({
    type: DataType.DATEONLY,
    allowNull: true
  })
  declare sale_end_date: Date;

  @BelongsTo(() => VisaCategory, {
    targetKey: 'guid',
    foreignKey: 'category_guid'
  })
  declare visaCategory: VisaCategory;
}
