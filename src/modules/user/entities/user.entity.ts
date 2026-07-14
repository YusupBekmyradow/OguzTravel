import { Table, Model, Column, DataType, BeforeCreate, BeforeUpdate, BelongsTo } from "sequelize-typescript";
import { Employee } from "../../employee/entities/employee.entity";

@Table({
  tableName: 'tbl_users',
  timestamps: true
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
    allowNull: true
  })
  declare password?: string;

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
    targetKey: 'guid'
  })
  declare employee: Employee;

  @BeforeCreate
  @BeforeUpdate
  static validateEmployeeGuid(instance: User) {
    if (!instance.isExternalUser && !instance.employee_guid) {
      throw new Error("Employee must required");
    }
  }
}