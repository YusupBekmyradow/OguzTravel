import { Table, Model, Column, DataType, BelongsTo, } from 'sequelize-typescript';
import { User } from '../../user/entities/user.entity';

@Table({
  tableName: 'tbl_user_details',
  timestamps: true,
})
export class UserDetail extends Model<UserDetail> {
  @Column({
    primaryKey: true,
    allowNull: false,
    defaultValue: DataType.UUIDV4,
    type: DataType.UUID,
  })
  declare guid: string;

  @Column({
    type: DataType.UUID,
    allowNull: false,
    unique: true,
  })
  declare user_guid: string;

  @Column({
    type: DataType.STRING,
    allowNull: true
  })
  declare full_name?: string;

  @Column({
    type: DataType.STRING,
    allowNull: true
  })
  declare role?: string;

  @Column({
    type: DataType.
      STRING, allowNull: true
  })
  declare status?: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true
  })
  declare avatar_url?: string;

  @Column({
    type: DataType.JSONB,
    allowNull: true,
    defaultValue: {}
  })
  declare contact?: {
    email?: string;
    phone?: string;
    location?: string;
    website?: string;
    linkedin?: string;
  };

  @Column({
    type: DataType.JSONB,
    allowNull: true,
    defaultValue: []
  })
  declare skills?: string[];

  @Column({
    type: DataType.TEXT,
    allowNull: true
  })
  declare personal_summary?: string;

  @Column({
    type: DataType.JSONB,
    allowNull: true,
    defaultValue: []
  })
  declare work_experience?: Array<{
    id: string;
    role: string;
    company: string;
    location: string;
    period: string;
    bullets: string[];
  }>;

  @Column({
    type: DataType.JSONB,
    allowNull: true,
    defaultValue: []
  })
  declare education?: Array<{
    id: string;
    degree: string;
    school: string;
    period: string;
  }>;

  @Column({
    type: DataType.JSONB,
    allowNull: true,
    defaultValue: []
  })
  declare certifications?: Array<{
    id: string;
    title: string;
    year: string;
  }>;

  @Column({
    type: DataType.JSONB,
    allowNull: true,
    defaultValue: []
  })
  declare languages?: Array<{
    id: string;
    name: string;
    level: string;
  }>;

  @Column({
    type: DataType.JSONB,
    allowNull: true,
    defaultValue: []
  })
  declare references?: Array<{
    id: string;
    text: string;
  }>;

  @BelongsTo(() => User, {
    foreignKey: 'user_guid',
    targetKey: 'guid',
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  declare user: User;
}