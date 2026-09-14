import { Table, Column, Model, DataType, HasMany } from 'sequelize-typescript';

@Table({
  tableName: 'tbl_reports',
  timestamps: true,
})
export class Report extends Model<Report> {
  @Column({
    primaryKey: true,
    allowNull: false,
    defaultValue: DataType.UUIDV4,
    type: DataType.UUID,
  })
  declare guid: string;

  @Column({
    type: DataType.INTEGER,
    autoIncrement: true,
    allowNull: false,
    unique: true,
  })
  declare index_number: number;

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  declare name: string;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  declare start_yh_number: number;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  declare end_yh_number: number;

  @Column({
    type: DataType.INTEGER,
    allowNull: false
  })
  declare total_letter: number;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  declare note?: string;

}
