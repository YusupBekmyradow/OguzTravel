import { Column, DataType, Model, Table } from 'sequelize-typescript';
import { FieldType } from '../../../enums/custom-field-type.enum';

@Table({
  tableName: 'tbl_custom_fields',
  timestamps: true,
})
export class CustomField extends Model<CustomField> {
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
    defaultValue: {},
  })
  declare field_label: {
    tk: string;
    ru: string;
    en: string;
  };

  @Column({
    type: DataType.ENUM(...Object.values(FieldType)),
    allowNull: false,
  })
  declare field_type: FieldType;

  @Column({
    type: DataType.JSONB,
    allowNull: true,
    defaultValue: null,
  })
  declare options?: string[];

  @Column({
    type: DataType.INTEGER,
    allowNull: true,
    defaultValue: 0,
  })
  declare sort_order?: number;

  @Column({
    type: DataType.STRING,
    allowNull: false,
    defaultValue: 0,
  })
  declare field_key: string;
}