import { Table, Model, Column, DataType, BelongsTo, ForeignKey } from "sequelize-typescript";
import { VisaDoc } from "./visa_doc.entity";

export interface TableCell {
  value: string;
  rowSpan: number;
  colSpan: number;
}

export interface TableColumn {
  id: string;
  name: string;
  width?: number;
}

export interface TableRow {
  id: string;
  cells: Record<string, TableCell>;
}

export interface TableData {
  columns: TableColumn[];
  rows: TableRow[];
}

@Table({
  tableName: 'tbl_doc_details',
  timestamps: true
})
export class DocDetails extends Model<DocDetails> {
  @Column({
    primaryKey: true,
    allowNull: false,
    defaultValue: DataType.UUIDV4,
    type: DataType.UUID
  })
  declare guid: string;

  @ForeignKey(() => VisaDoc)
  @Column({
    type: DataType.UUID,
    allowNull: false
  })
  declare visa_doc_guid: string;

  @Column({
    type: DataType.TEXT,
    allowNull: false
  })
  declare title: string;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    defaultValue: 0
  })
  declare orderIndex: number;

  @Column({
    type: DataType.JSONB,
    allowNull: false,
    defaultValue: { columns: [], rows: [] }
  })
  declare data: TableData;

  @Column({
    type: DataType.TEXT,
    allowNull: true
  })
  declare note: string | null;

  @BelongsTo(() => VisaDoc, {
    targetKey: 'guid',
    foreignKey: 'visa_doc_guid',
  })
  declare visaDoc: VisaDoc;
}