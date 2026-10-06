import { Column, DataType, Model, Table } from "sequelize-typescript";
@Table({
  tableName: 'tbl_inbound_invitations',
  timestamps: true,
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
