import { Column, DataType, Model, Table } from "sequelize-typescript";

/** "GELEN" report: foreign tourists received, one row per person. */
@Table({
  tableName: 'tbl_inbound_arrivals',
  timestamps: true,
  // Every list, summary and export filters and orders by this date.
  indexes: [{ fields: ['entry_date'] }],
})
export class InboundArrival extends Model<InboundArrival> {
  @Column({
    primaryKey: true,
    allowNull: false,
    defaultValue: DataType.UUIDV4,
    type: DataType.UUID
  })
  declare guid: string;

  @Column({
    type: DataType.INTEGER,
    autoIncrement: true,
    allowNull: false,
    unique: true
  })
  declare index_number: number;

  @Column({
    type: DataType.STRING,
    allowNull: false
  })
  declare full_name: string;

  /** MALE | FEMALE */
  @Column({
    type: DataType.STRING,
    allowNull: false
  })
  declare gender: string;

  @Column({
    type: DataType.DATEONLY,
    allowNull: true
  })
  declare birth_date?: string | null;

  @Column({
    type: DataType.STRING,
    allowNull: false
  })
  declare passport_number: string;

  @Column({
    type: DataType.STRING,
    allowNull: false
  })
  declare citizenship: string;

  @Column({
    type: DataType.STRING,
    allowNull: true
  })
  declare invitation_number?: string;

  @Column({
    type: DataType.STRING,
    allowNull: true
  })
  declare voucher_number?: string;

  @Column({
    type: DataType.DATEONLY,
    allowNull: false
  })
  declare entry_date: string;

  @Column({
    type: DataType.DATEONLY,
    allowNull: true
  })
  declare exit_date?: string | null;

  /** Border checkpoint (BGN / GGÝMN) of entry. */
  @Column({
    type: DataType.STRING,
    allowNull: true
  })
  declare entry_border?: string;

  /** Border checkpoint (BGN / GGÝMN) of exit. */
  @Column({
    type: DataType.STRING,
    allowNull: true
  })
  declare exit_border?: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true
  })
  declare note?: string;
}
