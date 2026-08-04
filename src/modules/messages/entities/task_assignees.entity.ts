import { Model, Column, DataType, Table, BelongsTo } from "sequelize-typescript";
import { Message } from "./message.entity";
import { User } from "../../user/entities/user.entity";

@Table({
  tableName: 'tbl_task_assignees',
  timestamps: true,
})
export class TaskAssignee extends Model<TaskAssignee> {
  @Column({
    primaryKey: true,
    allowNull: false,
    defaultValue: DataType.UUIDV4,
    type: DataType.UUID
  })
  declare guid: string;

  @Column({
    type: DataType.UUID,
    allowNull: false,
  })
  declare task_guid: string;

  @Column({
    type: DataType.UUID,
    allowNull: false,
  })
  declare assignee_guid: string;

  @Column({
    type: DataType.BOOLEAN,
    defaultValue: false,
  })
  declare isRead: boolean;

  @BelongsTo(() => Message, {
    foreignKey: 'task_guid',
    targetKey: 'guid',
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  declare task: Message;

  @BelongsTo(() => User, {
    foreignKey: 'assignee_guid',
    targetKey: 'guid',
    onDelete: 'SET NULL',
    onUpdate: 'SET NULL',
  })
  declare user: User;
}