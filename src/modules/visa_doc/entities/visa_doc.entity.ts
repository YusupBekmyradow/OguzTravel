import { Table, Model, Column, DataType, HasMany } from "sequelize-typescript";
import { DocDetails } from "./doc_details.entity";

@Table({
  tableName: 'tbl_visa_doc',
  timestamps: true
})
export class VisaDoc extends Model<VisaDoc> {
  @Column({
    primaryKey: true,
    allowNull: false,
    defaultValue: DataType.UUIDV4,
    type: DataType.UUID
  })
  declare guid: string;

  @Column({
    type: DataType.TEXT,
    allowNull: false
  })
  declare title: string;

  @Column({
    type: DataType.STRING,
    allowNull: true
  })
  declare country: string;

  @HasMany(() => DocDetails, {
    foreignKey: 'visa_doc_guid',
    sourceKey: 'guid'
  })
  declare docDetails: DocDetails[];
}