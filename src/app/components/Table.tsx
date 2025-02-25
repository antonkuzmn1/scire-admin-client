import {dateToString} from "../../utils/formatDate.ts";
import {Add, Delete, Download, Edit, FilterAlt} from "@mui/icons-material";

type TypeField = 'String' | 'Integer' | 'Boolean' | 'Date';

interface TableHeaders<Field> {
    text: string,
    field: keyof Field,
    width: string,
    type: TypeField,
}

interface TableProps<T> {
    tableHeaders: TableHeaders<T>[];
    rows: T[]
    openFilterDialog?: () => void;
    openCreateDialog?: () => void;
    openUpdateDialog?: (item: T) => void;
    openDeleteDialog?: (item: T) => void;
    download?: (item: T) => void;
}


const Table = <T extends {}>({
                                 tableHeaders,
                                 rows,
                                 openFilterDialog,
                                 openDeleteDialog,
                                 openUpdateDialog,
                                 openCreateDialog,
                                 download,
                             }: TableProps<T>) => {
    return (
        <div className={'p-4 w-fit mx-auto'}>
            <div className={'mb-15'}>
                <table className={'sticky top-0'}>
                    <thead>
                    <tr>
                        {(openFilterDialog || openCreateDialog || openUpdateDialog || openDeleteDialog || download) && (
                            <td
                                style={{
                                    minWidth: ((openUpdateDialog && openDeleteDialog && download)
                                            ? '144px'
                                            : ((openFilterDialog && openCreateDialog) || (openUpdateDialog && openDeleteDialog) || (openUpdateDialog && download) || (openDeleteDialog && download))
                                                ? '96px'
                                                : '48px'
                                    ),
                                }}
                                className="bg-white border border-gray-300"
                            >
                                <div className={'flex'}>
                                    {openFilterDialog && (
                                        <button
                                            onClick={openFilterDialog}
                                            className={'text-gray-700 hover:bg-gray-300 transition-colors duration-200 h-12 w-full'}
                                            children={<FilterAlt/>}
                                        />
                                    )}
                                    {openCreateDialog && (
                                        <button
                                            onClick={openCreateDialog}
                                            className={'text-gray-700 hover:bg-gray-300 transition-colors duration-200 h-12 w-full'}
                                            children={<Add/>}
                                        />
                                    )}
                                </div>
                            </td>
                        )}
                        {tableHeaders.map((tableHeader: TableHeaders<T>, index: number) => (
                            <td
                                key={index}
                                style={{
                                    maxWidth: tableHeader.width,
                                    minWidth: tableHeader.width,
                                }}
                                className={'text-gray-700 bg-white border border-gray-300 p-2'}
                            >
                                {tableHeader.text}
                            </td>
                        ))}
                    </tr>
                    </thead>
                </table>
                <table className={'mt-[-1px]'}>
                    <tbody>
                    {rows.map((item: T, index: number) => (
                        <tr key={index}>
                            {(openFilterDialog || openCreateDialog || openUpdateDialog || openDeleteDialog || download) && (
                                <td
                                    style={{
                                        minWidth: ((openUpdateDialog && openDeleteDialog && download)
                                                ? '144px'
                                                : ((openFilterDialog && openCreateDialog) || (openUpdateDialog && openDeleteDialog) || (openUpdateDialog && download) || (openDeleteDialog && download))
                                                    ? '96px'
                                                    : '48px'
                                        ),
                                    }}
                                    className="bg-white border border-gray-300 h-12"
                                >
                                    <div className={'flex'}>
                                        {openUpdateDialog && (
                                            <button
                                                onClick={() => openUpdateDialog(item)}
                                                className={'text-gray-700 hover:bg-gray-300 transition-colors duration-200 h-12 w-full'}
                                                children={<Edit/>}
                                            />
                                        )}
                                        {openDeleteDialog && (
                                            <button
                                                onClick={() => openDeleteDialog(item)}
                                                className={'text-gray-700 hover:bg-gray-300 transition-colors duration-200 h-12 w-full'}
                                                children={<Delete/>}
                                            />
                                        )}
                                        {download && (
                                            <button
                                                onClick={() => download(item)}
                                                className={'text-gray-700 hover:bg-gray-300 transition-colors duration-200 h-12 w-full'}
                                                children={<Download/>}
                                            />
                                        )}
                                    </div>
                                </td>
                            )}
                            {tableHeaders.map((tableHeader: TableHeaders<T>, index: number) => {
                                if (tableHeader.type === 'Integer') {
                                    return (
                                        <td key={index}
                                            style={{maxWidth: tableHeader.width, minWidth: tableHeader.width}}
                                            className={'text-gray-700 bg-white border border-gray-300 p-2'}
                                        >
                                            {String(item[tableHeader.field])}
                                        </td>
                                    )
                                } else if (tableHeader.type === 'String') {
                                    return (
                                        <td key={index}
                                            style={{maxWidth: tableHeader.width, minWidth: tableHeader.width}}
                                            className={'text-gray-700 bg-white border border-gray-300 p-2'}
                                        >
                                            {item[tableHeader.field] ? String(item[tableHeader.field]) : ''}
                                        </td>
                                    )
                                } else if (tableHeader.type === 'Boolean') {
                                    return (
                                        <td key={index}
                                            style={{maxWidth: tableHeader.width, minWidth: tableHeader.width}}
                                            className={'text-gray-700 bg-white border border-gray-300 p-2'}
                                        >
                                            {item[tableHeader.field] ? 'True' : 'False'}
                                        </td>
                                    )
                                } else if (tableHeader.type === 'Date') {
                                    return (
                                        <td key={index}
                                            style={{maxWidth: tableHeader.width, minWidth: tableHeader.width}}
                                            className={'text-gray-700 bg-white border border-gray-300 p-2'}
                                        >
                                            {item[tableHeader.field] ? dateToString(new Date(item[tableHeader.field] as string)) : ''}
                                        </td>
                                    )
                                } else {
                                    return (
                                        <td key={index}
                                            style={{maxWidth: tableHeader.width, minWidth: tableHeader.width}}
                                            className={'text-gray-700 bg-white border border-gray-300 p-1'}
                                        >
                                            Error!
                                        </td>
                                    )
                                }
                            })}
                        </tr>
                    ))}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
export default Table;
