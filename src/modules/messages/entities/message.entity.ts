import { Model, Column, DataType, Table, BelongsTo, HasMany } from "sequelize-typescript";
import { User } from "../../user/entities/user.entity";
import { TaskAssignee } from "./task_assignees.entity";

@Table({
  tableName: 'tbl_messages',
  timestamps: true,
})
export class Message extends Model<Message> {
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
    type: DataType.UUID,
    allowNull: true
  })
  declare adm_user_guid: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  declare title?: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  declare description?: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  declare priority?: string;

  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  declare status?: number;

  @Column({
    type: DataType.DATE,
    allowNull: true
  })
  declare due_date: Date;

  // Task window. `due_date` is kept equal to `end_date` for older clients.
  @Column({
    type: DataType.DATE,
    allowNull: true
  })
  declare start_date: Date;

  @Column({
    type: DataType.DATE,
    allowNull: true
  })
  declare end_date: Date;

  @Column({
    type: DataType.BOOLEAN,
    defaultValue: true,
  })
  declare isMessage: boolean;

  @Column({
    type: DataType.JSONB,
    allowNull: true,
    defaultValue: [],
    get() {
      const rawValue = this.getDataValue('images');
      if (!rawValue) return [];
      if (typeof rawValue === 'string') {
        try {
          return JSON.parse(rawValue);
        } catch (e) {
          return [];
        }
      }
      return Array.isArray(rawValue) ? rawValue : [];
    }
  })
  declare images: string[];

  @HasMany(() => TaskAssignee, {
    foreignKey: 'task_guid',
    sourceKey: 'guid'
  })
  declare empltaskAssignee: TaskAssignee[];

  @BelongsTo(() => User, {
    targetKey: 'guid',
    foreignKey: 'adm_user_guid',
    onDelete: 'SET NULL',
    onUpdate: 'SET NULL'
  })
  declare admuser: User;
}
