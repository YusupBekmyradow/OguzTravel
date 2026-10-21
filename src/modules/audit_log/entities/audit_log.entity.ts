import { Table, Model, Column, DataType, BelongsTo } from 'sequelize-typescript';
import { User } from '../../user/entities/user.entity';

@Table({
  tableName: 'tbl_audit_logs',
  timestamps: false,
})
export class AuditLog extends Model<AuditLog> {
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
  declare user_guid: string | null;

  @Column({
    type: DataType.STRING(20),
    allowNull: false,
  })
  declare action: 'CREATE' | 'UPDATE' | 'DELETE';

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  declare endpoint: string;

  @Column({
    type: DataType.STRING(100),
    allowNull: true,
  })
  declare module: string | null;

  @Column({
    type: DataType.JSONB,
    allowNull: true,
  })
  declare request_body: Record<string, any> | null;

  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  declare status_code: number | null;

  @Column({
    type: DataType.BOOLEAN,
    defaultValue: true,
  })
  declare is_success: boolean;

  @Column({
    type: DataType.STRING(50),
    allowNull: true,
  })
  declare ip_address: string | null;

  @Column({
    type: DataType.DATE,
    allowNull: false,
    defaultValue: DataType.NOW,
  })
  declare created_at: Date;

  @BelongsTo(() => User, {
    foreignKey: 'user_guid',
    targetKey: 'guid',
    onDelete: 'SET NULL',
    onUpdate: 'CASCADE',
  })
  declare user: User;
}
