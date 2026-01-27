// src/components/ui/Table.tsx
// Table Component

import { ReactNode } from 'react';

interface TableProps {
    children: ReactNode;
    className?: string;
}

export function Table({ children, className = '' }: TableProps) {
    return (
        <div className="overflow-x-auto rounded-lg border border-gray-200">
            <table className={`min-w-full divide-y divide-gray-200 ${className}`}>
                {children}
            </table>
        </div>
    );
}

interface TableHeaderProps {
    children: ReactNode;
    className?: string;
}

export function TableHeader({ children, className = '' }: TableHeaderProps) {
    return (
        <thead className={`bg-gray-50 ${className}`}>
            {children}
        </thead>
    );
}

interface TableBodyProps {
    children: ReactNode;
    className?: string;
}

export function TableBody({ children, className = '' }: TableBodyProps) {
    return (
        <tbody className={`bg-white divide-y divide-gray-200 ${className}`}>
            {children}
        </tbody>
    );
}

interface TableRowProps {
    children: ReactNode;
    className?: string;
    onClick?: () => void;
    isClickable?: boolean;
}

export function TableRow({
    children,
    className = '',
    onClick,
    isClickable = false,
}: TableRowProps) {
    return (
        <tr
            onClick={onClick}
            className={`
        ${isClickable ? 'hover:bg-gray-50 cursor-pointer' : ''}
        ${className}
      `}
        >
            {children}
        </tr>
    );
}

interface TableHeadProps {
    children: ReactNode;
    className?: string;
    sortable?: boolean;
    sortDirection?: 'asc' | 'desc' | null;
    onSort?: () => void;
}

export function TableHead({
    children,
    className = '',
    sortable = false,
    sortDirection,
    onSort,
}: TableHeadProps) {
    return (
        <th
            scope="col"
            onClick={sortable ? onSort : undefined}
            className={`
        px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider
        ${sortable ? 'cursor-pointer hover:bg-gray-100' : ''}
        ${className}
      `}
        >
            <div className="flex items-center gap-1">
                {children}
                {sortable && sortDirection && (
                    <span>
                        {sortDirection === 'asc' ? '↑' : '↓'}
                    </span>
                )}
            </div>
        </th>
    );
}

interface TableCellProps {
    children: ReactNode;
    className?: string;
    colSpan?: number;
}

export function TableCell({ children, className = '', colSpan }: TableCellProps) {
    return (
        <td
            colSpan={colSpan}
            className={`px-6 py-4 whitespace-nowrap text-sm text-gray-900 ${className}`}
        >
            {children}
        </td>
    );
}

// Empty state component for tables
interface TableEmptyProps {
    message?: string;
    description?: string;
    colSpan: number;
}

export function TableEmpty({
    message = 'No data',
    description,
    colSpan,
}: TableEmptyProps) {
    return (
        <TableRow>
            <TableCell colSpan={colSpan} className="text-center py-12">
                <div className="text-gray-500">
                    <div className="text-lg font-medium">{message}</div>
                    {description && (
                        <div className="text-sm mt-1">{description}</div>
                    )}
                </div>
            </TableCell>
        </TableRow>
    );
}

