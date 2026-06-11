"use client";
import Link from "next/link";
import { DataTable } from "@/app/admin/components/DataTable";
import type { ColumnConfig, ContentRecord } from "@/lib/content/shared";

interface Props {
  type: string;
  columns: ColumnConfig[];
  records: ContentRecord[];
}

export function ContentListTable({ type, columns, records }: Props) {
  const tableColumns = [
    ...columns.map((col) => ({ key: col.key, header: col.label })),
    {
      key: "_actions",
      header: "",
      render: (item: ContentRecord) => (
        <Link
          href={`/admin/content/${type}/${item.id}`}
          className="text-sm text-brand-600 hover:underline dark:text-brand-400"
        >
          Редактирай
        </Link>
      ),
    },
  ];

  return (
    <DataTable
      columns={tableColumns}
      data={records as any[]}
      keyField="id"
    />
  );
}
