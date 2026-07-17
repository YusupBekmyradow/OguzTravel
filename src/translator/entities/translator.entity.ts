import { Table, Model, Column, DataType } from "sequelize-typescript";

@Table({
  tableName: 'tbl_translator',
  timestamps: true
})

export class Translator extends Model<Translator> {
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
  declare fullName: string;

  @Column({
    type: DataType.INTEGER,
    autoIncrement: true,
    allowNull: false,
    unique: true
  })
  declare index_number: number;

}
