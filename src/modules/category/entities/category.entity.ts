import { Table, Column, Model, DataType, HasMany } from 'sequelize-typescript';
import { TotalCalculation } from '../../total_calculations/entities/total_calculation.entity';

@Table({
  tableName: 'tbl_categories',
  timestamps: true,
})
export class Category extends Model<Category> {
  @Column({
    primaryKey: true,
    allowNull: false,
    defaultValue: DataType.UUIDV4,
    type: DataType.UUID,
  })
  declare guid: string;

  @Column({
    type: DataType.JSONB,
    allowNull: false,
  })
  declare name: {
    tk: string;
    ru: string;
    en: string;
  };

  @Column({
    type: DataType.INTEGER,
    autoIncrement: true,
    allowNull: false,
    unique: true,
  })
  declare index_number: number;

  @HasMany(() => TotalCalculation, {
    foreignKey: 'category_guid',
    sourceKey: 'guid',
  })
  declare totalCalculations: TotalCalculation[];
}
