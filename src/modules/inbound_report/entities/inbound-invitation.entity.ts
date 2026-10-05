import { Column, DataType, Model, Table } from "sequelize-typescript";

/**
 * "ÇAKYLYKLAR-Migrasiýa" report: results of the invitation applications
 * handed to the State Migration Service, counted in people, per country and month.
 */
@Table({
  tableName: 'tbl_inbound_invitations',
  timestamps: true,
  // Every list, summary and export filters and orders by this date.
  indexes: [{ fields: ['report_month'] }],
})
export class InboundInvitation extends Model<InboundInvitation> {
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

  /** First day of the report month. */
  @Column({
    type: DataType.DATEONLY,
    allowNull: false
  })
  declare report_month: string;

  @Column({
    type: DataType.STRING,
    allowNull: false
  })
  declare country: string;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    defaultValue: 0
  })
  declare granted_count: number;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    defaultValue: 0
  })
  declare refused_count: number;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    defaultValue: 0
  })
  declare pending_count: number;

  /** Applications submitted = granted + refused + pending, as in the report form. */
  @Column({
    type: DataType.VIRTUAL,
    get(this: InboundInvitation) {
      return (
        Number(this.getDataValue('granted_count') || 0) +
        Number(this.getDataValue('refused_count') || 0) +
        Number(this.getDataValue('pending_count') || 0)
      );
    },
  })
  declare submitted_count: number;

  @Column({
    type: DataType.TEXT,
    allowNull: true
  })
  declare note?: string;
}
