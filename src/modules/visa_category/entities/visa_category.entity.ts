import { Column, DataType, HasMany, Model, Table } from "sequelize-typescript";
import { VisaPackage } from "../../visa_package/entities/visa_package.entity";

@Table({
  tableName: 'tbl_visa_category',
  timestamps: true
})

export class VisaCategory extends Model<VisaCategory> {
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
  })
  declare name: string

  @HasMany(() => VisaPackage, {
    foreignKey: 'category_guid',
    sourceKey: 'guid'
  })
  declare visaPackage: VisaPackage[];
}
