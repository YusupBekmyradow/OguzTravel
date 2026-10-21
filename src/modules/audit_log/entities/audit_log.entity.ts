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

  // Kim yaptı — JWT'den gelen user guid
  @Column({
    type: DataType.UUID,
    allowNull: true,
  })
  declare user_guid: string | null;

  // Ne yaptı: CREATE | UPDATE | DELETE
  @Column({
    type: DataType.STRING(20),
    allowNull: false,
  })
  declare action: 'CREATE' | 'UPDATE' | 'DELETE';

  // Hangi endpoint: /api/v1/tour/add-tour, /api/v1/visa/create...
  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  declare endpoint: string;

  // Hangi modül: tour, visa, hotel, user...  (endpoint'ten otomatik çıkarılır)
  @Column({
    type: DataType.STRING(100),
    allowNull: true,
  })
  declare module: string | null;

  // Request body — gönderilen data (password alanları temizlenir)
  @Column({
    type: DataType.JSONB,
    allowNull: true,
  })
  declare request_body: Record<string, any> | null;

  // HTTP status kodu: 200, 201, 400...
  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  declare status_code: number | null;

  // İşlem başarılı mıydı?
  @Column({
    type: DataType.BOOLEAN,
    defaultValue: true,
  })
  declare is_success: boolean;

  // IP adresi
  @Column({
    type: DataType.STRING(50),
    allowNull: true,
  })
  declare ip_address: string | null;

  // Ne zaman yapıldı
  @Column({
    type: DataType.DATE,
    allowNull: false,
    defaultValue: DataType.NOW,
  })
  declare created_at: Date;

  // İlişki: user bilgisi için (employee join ederek isim alınabilir)
  @BelongsTo(() => User, {
    foreignKey: 'user_guid',
    targetKey: 'guid',
    onDelete: 'SET NULL',
    onUpdate: 'CASCADE',
  })
  declare user: User;
}
