import { BelongsTo, Column, DataType, Model, Table } from 'sequelize-typescript';
import { Country } from '../../country/entities/country.entity';

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
    type: DataType.UUID,
    allowNull: true,
  })
  declare country_guid: string;

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  declare field_key: string;

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
    type: DataType.STRING,
    allowNull: false,
  })
  declare field_type: string;

  @Column({
    type: DataType.JSONB,
    allowNull: true,
    defaultValue: null,
  })
  declare options?: string[];

  @Column({
    type: DataType.BOOLEAN,
    allowNull: false,
    defaultValue: true,
  })
  declare is_required: boolean;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    defaultValue: 0,
  })
  declare sort_order: number;

  @Column({
    type: DataType.BOOLEAN,
    allowNull: false,
    defaultValue: true,
  })
  declare is_active: boolean;

  @BelongsTo(() => Country, {
    targetKey: 'guid',
    foreignKey: 'country_guid',
    onDelete: 'SET NULL',
    onUpdate: 'SET NULL',
  })
  declare country: Country;
}
