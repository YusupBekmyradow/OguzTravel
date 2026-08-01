import { Model, Column, DataType, Table, BelongsTo } from "sequelize-typescript";
import { User } from "../../user/entities/user.entity";

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
    allowNull: false
  })
  declare assignee_guid: string;

  @Column({
    type: DataType.UUID,
    allowNull: false
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
    type: DataType.STRING,
    allowNull: true,
  })
  declare status?: string;

  @Column({
    type: DataType.DATE,
    allowNull: true
  })
  declare due_date: Date;

  @Column({
    type: DataType.BOOLEAN,
    defaultValue: false,
  })
  declare isRead: boolean;

  @Column({
    type: DataType.BOOLEAN,
    defaultValue: true,
  })
  declare isMessage: boolean;

  @BelongsTo(() => User, {
    targetKey: 'guid',
    foreignKey: 'assignee_guid',
    onDelete: 'SET NULL',
    onUpdate: 'SET NULL'
  })
  declare empluser: User;

  @BelongsTo(() => User, {
    targetKey: 'guid',
    foreignKey: 'adm_user_guid',
    onDelete: 'SET NULL',
    onUpdate: 'SET NULL'
  })
  declare admuser: User;
}
