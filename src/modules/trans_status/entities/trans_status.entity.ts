import { Model, Column, DataType, Table, HasMany } from "sequelize-typescript";
import { GeneralTranslation } from "../../general_translation/entities/general_translation.entity";

@Table({
  tableName: 'tbl_trans_status',
  timestamps: true
})

export class TransStatus extends Model<TransStatus> {

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
  declare name: string;

  @Column({
    type: DataType.INTEGER,
    autoIncrement: true,
    allowNull: false,
    unique: true
  })
  declare index_number: number;

  @HasMany(() => GeneralTranslation, {
    foreignKey: 'status_guid',
    sourceKey: 'guid'
  })
  declare generalTranslation: GeneralTranslation[];
}
