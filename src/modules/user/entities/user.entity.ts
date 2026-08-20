import { Table, Model, Column, DataType, BeforeCreate, BeforeUpdate, BelongsTo, Index, HasMany, HasOne } from "sequelize-typescript";
import { Employee } from "../../employee/entities/employee.entity";
import { IsNotEmpty, ValidateIf, IsUUID } from "class-validator";
import { ApiPropertyOptional } from "@nestjs/swagger";
import { Message } from "../../messages/entities/message.entity";
import { TaskAssignee } from "../../messages/entities/task_assignees.entity";
import { Op } from "sequelize";
import { UserDetail } from "../../user_datails/entities/user_datail.entity";

@Table({
  tableName: 'tbl_users',
  timestamps: true,
  indexes: [
    {
      name: 'unique_employee_guid_not_null',
      unique: true,
      fields: ['employee_guid'],
      where: {
        employee_guid: {
          [Op.ne]: null,
        },
      },
    },
  ],
})

export class User extends Model<User> {
  @Column({
    primaryKey: true,
    allowNull: false,
    defaultValue: DataType.UUIDV4,
    type: DataType.UUID
  })
  declare guid: string;

  @Column({
    type: DataType.UUID,
    allowNull: true
  })
  declare employee_guid?: string;

  @Column({
    type: DataType.BOOLEAN,
    defaultValue: true
  })
  declare isActive: boolean;

  @Column({
    type: DataType.BOOLEAN,
    defaultValue: false
  })
  declare isExternalUser: boolean;

  @Column({
    type: DataType.STRING,
    allowNull: false
  })
  declare password: string;

  @Column({
    type: DataType.JSONB,
    allowNull: false,
    defaultValue: []
  })
  declare permissions?: string[];

  @Column({
    type: DataType.STRING,
    allowNull: true
  })
  declare phone_number?: string;

  @Column({
    type: DataType.STRING,
    allowNull: false,
    defaultValue: 'User'
  })
  declare role: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true
  })
  declare refresh_token?: string;

  @Column({
    type: DataType.INTEGER,
    autoIncrement: true,
    allowNull: false,
    unique: true
  })
  declare index_number: number;

  @BelongsTo(() => Employee, {
    foreignKey: 'employee_guid',
    targetKey: 'guid',
    onDelete: 'SET NULL',
    onUpdate: 'SET NULL'
  })
  declare employee: Employee;

  @HasMany(() => TaskAssignee, {
    foreignKey: 'assignee_guid',
    sourceKey: 'guid'
  })
  declare empltaskAssignee: TaskAssignee[];

  @HasMany(() => Message, {
    foreignKey: 'adm_user_guid',
    sourceKey: 'guid'
  })
  declare admmessage: Message[];

  @HasOne(() => UserDetail, {
    foreignKey: 'user_guid',
    sourceKey: 'guid',
  })
  declare userDetail: UserDetail;

  @BeforeCreate
  @BeforeUpdate
  static validateEmployeeGuid(instance: User) {
    if (!instance.isExternalUser && !instance.employee_guid) {
      throw new Error("Employee must required");
    }
  }
}