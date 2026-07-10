import { Model, BelongsTo, Column, DataType, Table, AllowNull, HasOne, HasMany } from "sequelize-typescript";
import { Office } from "../../office/entities/office.entity";
import { Position } from "../../position/entities/position.entity";
import { Department } from "../../department/entities/department.entity";
import { User } from "../../user/entities/user.entity";
import { B2b } from "../../b2b/entities/b2b.entity";
import { TurkishAirline } from "../../turkish_airlines/entities/turkish_airline.entity";

@Table({
  tableName: 'tbl_employees',
  timestamps: true
})

export class Employee extends Model<Employee> {

  @Column({
    primaryKey: true,
    allowNull: false,
    defaultValue: DataType.UUIDV4,
    type: DataType.UUID
  })
  declare guid: string;

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  declare fullName: string;

  @Column({
    type: DataType.STRING,
    allowNull: false
  })
  declare phone_number: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
    unique: true
  })
  declare gmail?: string;

  @Column({
    type: DataType.INTEGER,
    autoIncrement: true,
    allowNull: false,
    unique: true
  })
  declare index_number: number;

  @Column({
    type: DataType.JSONB,
    allowNull: true
  })
  declare address: string;

  @Column({
    type: DataType.UUID,
    allowNull: false
  })
  declare office_guid: string;

  @Column({
    type: DataType.UUID,
    allowNull: false
  })
  declare position_guid: string;

  @Column({
    type: DataType.UUID,
    allowNull: true
  })
  declare department_guid: string;

  @BelongsTo(() => Office, {
    targetKey: 'guid',
    foreignKey: 'office_guid'
  })
  declare office: Office;

  @BelongsTo(() => Position, {
    targetKey: 'guid',
    foreignKey: 'position_guid'
  })
  declare position: Position;

  @BelongsTo(() => Department, {
    targetKey: 'guid',
    foreignKey: 'department_guid'
  })
  declare department: Department;

  @HasMany(() => User, {
    foreignKey: 'employee_guid',
    sourceKey: 'guid'
  })
  declare user: User[];

  @HasMany(() => B2b, {
    foreignKey: 'assignment_opr_guid',
    sourceKey: 'guid',
    as: 'assignment_operator'
  })
  declare b2bOperator: B2b[];

  @HasMany(() => B2b, {
    foreignKey: 'receiver_opr_guid',
    sourceKey: 'guid',
    as: 'receiver_operator'
  })
  declare b2bRecipient: B2b[];

    @HasMany(() => TurkishAirline, {
    foreignKey: 'assignment_opr_guid',
    sourceKey: 'guid',
    as: 'ta_assignment_operator'
  })
  declare airlineOperator: TurkishAirline[];

  @HasMany(() => TurkishAirline, {
    foreignKey: 'receiver_opr_guid',
    sourceKey: 'guid',
    as: 'ta_receiver_operator'
  })
  declare airlineRecipient: TurkishAirline[];
}
