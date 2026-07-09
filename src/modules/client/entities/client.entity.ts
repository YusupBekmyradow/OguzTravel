import { Table, Model, Column, DataType } from "sequelize-typescript"


@Table({
  tableName: 'tbl_clients',
  timestamps: true
})

export class Client extends Model<Client> {

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
    type: DataType.DATEONLY,
    allowNull: false
  })
  declare dateOfBirth: Date;

  @Column({
    type: DataType.STRING,
    allowNull: false
  })
  declare passport_number: string;

  @Column({
    type: DataType.DATEONLY,
    allowNull: false
  })
  declare passportExpiryDate: Date;

  @Column({
    type: DataType.STRING,
    allowNull: false
  })
  declare passportCountryOfIssue: string;

  @Column({
    type: DataType.ENUM('Male', 'Female'), 
    allowNull: false
  })
  declare gender: string;
}
