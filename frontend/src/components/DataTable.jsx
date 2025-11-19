import { useState, useMemo } from 'react'
import { 
  FiChevronLeft, 
  FiChevronRight, 
  FiChevronsLeft, 
  FiChevronsRight,
  FiArrowUp,
  FiArrowDown,
  FiFilter,
  FiSearch,
  FiDownload,
  FiRefreshCw
} from 'react-icons/fi'
import { useLocale } from '../context/LocaleContext'

/**
 * Interactive DataTable Component
 * Features: Sorting, Filtering, Pagination, Search, Export
 * 
 * @param {Array} data - Array of data objects
 * @param {Array} columns - Column definitions [{key, label, sortable, filterable, render}]
 * @param {Number} pageSize - Items per page (default: 10)
 * @param {Boolean} searchable - Enable search (default: true)
 * @param {Boolean} exportable - Enable export (default: true)
 * @param {Function} onRowClick - Callback when row is clicked
 * @param {String} emptyMessage - Message when no data
 */
function DataTable({
  data = [],
  columns = [],
  pageSize = 10,
  searchable = true,
  exportable = true,
  onRowClick,
  emptyMessage,
  loading = false
}) {
  const { locale } = useLocale()
  const isAr = locale === 'ar'
  
  // State
  const [currentPage, setCurrentPage] = useState(1)
  const [searchTerm, setSearchTerm] = useState('')
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' })
  const [filters, setFilters] = useState({})
  const [selectedRows, setSelectedRows] = useState([])

  // Filterable columns
  const filterableColumns = columns.filter(col => col.filterable)

  // Filter data
  const filteredData = useMemo(() => {
    let result = [...data]

    // Apply search
    if (searchTerm && searchable) {
      result = result.filter(item => {
        return columns.some(col => {
          const value = item[col.key]
          if (value === null || value === undefined) return false
          return String(value).toLowerCase().includes(searchTerm.toLowerCase())
        })
      })
    }

    // Apply column filters
    filterableColumns.forEach(col => {
      const filterValue = filters[col.key]
      if (filterValue && filterValue !== '') {
        result = result.filter(item => {
          const value = item[col.key]
          return String(value).toLowerCase() === filterValue.toLowerCase() ||
                 String(value).toLowerCase().includes(filterValue.toLowerCase())
        })
      }
    })

    return result
  }, [data, searchTerm, filters, columns, searchable, filterableColumns])

  // Sort data
  const sortedData = useMemo(() => {
    if (!sortConfig.key) return filteredData

    return [...filteredData].sort((a, b) => {
      const aValue = a[sortConfig.key]
      const bValue = b[sortConfig.key]

      if (aValue === null || aValue === undefined) return 1
      if (bValue === null || bValue === undefined) return -1

      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortConfig.direction === 'asc' ? aValue - bValue : bValue - aValue
      }

      const aStr = String(aValue).toLowerCase()
      const bStr = String(bValue).toLowerCase()

      if (sortConfig.direction === 'asc') {
        return aStr.localeCompare(bStr)
      } else {
        return bStr.localeCompare(aStr)
      }
    })
  }, [filteredData, sortConfig])

  // Paginate data
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize
    return sortedData.slice(startIndex, startIndex + pageSize)
  }, [sortedData, currentPage, pageSize])

  // Pagination info
  const totalPages = Math.ceil(sortedData.length / pageSize)
  const startItem = (currentPage - 1) * pageSize + 1
  const endItem = Math.min(currentPage * pageSize, sortedData.length)

  // Handle sort
  const handleSort = (key) => {
    setSortConfig(prev => {
      if (prev.key === key) {
        return {
          key,
          direction: prev.direction === 'asc' ? 'desc' : 'asc'
        }
      }
      return { key, direction: 'asc' }
    })
  }

  // Handle filter change
  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }))
    setCurrentPage(1) // Reset to first page
  }

  // Get unique values for filter dropdown
  const getUniqueValues = (key) => {
    const values = [...new Set(data.map(item => item[key]).filter(v => v != null))]
    return values.sort()
  }

  // Export to CSV
  const handleExport = () => {
    const headers = columns.map(col => col.label || col.key).join(',')
    const rows = sortedData.map(item => 
      columns.map(col => {
        const value = item[col.key]
        return value != null ? String(value).replace(/,/g, ';') : ''
      }).join(',')
    ).join('\n')

    const csv = `${headers}\n${rows}`
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `export-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  // Toggle row selection
  const toggleRowSelection = (item, index) => {
    const globalIndex = (currentPage - 1) * pageSize + index
    setSelectedRows(prev => {
      if (prev.includes(globalIndex)) {
        return prev.filter(i => i !== globalIndex)
      }
      return [...prev, globalIndex]
    })
  }

  // Toggle all rows
  const toggleAllRows = () => {
    if (selectedRows.length === paginatedData.length) {
      setSelectedRows([])
    } else {
      const indices = paginatedData.map((_, index) => (currentPage - 1) * pageSize + index)
      setSelectedRows(indices)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-dga-green"></div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex flex-wrap items-center gap-4">
          {/* Search */}
          {searchable && (
            <div className="flex-1 min-w-[200px] relative">
              <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder={isAr ? 'بحث...' : 'Search...'}
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value)
                  setCurrentPage(1)
                }}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-dga-green"
              />
            </div>
          )}

          {/* Column Filters */}
          {filterableColumns.map(col => (
            <select
              key={col.key}
              value={filters[col.key] || ''}
              onChange={(e) => handleFilterChange(col.key, e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-dga-green"
            >
              <option value="">{isAr ? `جميع ${col.label}` : `All ${col.label}`}</option>
              {getUniqueValues(col.key).map(value => (
                <option key={value} value={value}>{value}</option>
              ))}
            </select>
          ))}

          {/* Export Button */}
          {exportable && (
            <button
              onClick={handleExport}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <FiDownload />
              <span>{isAr ? 'تصدير' : 'Export'}</span>
            </button>
          )}

          {/* Refresh Button */}
          <button
            onClick={() => {
              setSearchTerm('')
              setFilters({})
              setSortConfig({ key: null, direction: 'asc' })
              setCurrentPage(1)
            }}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <FiRefreshCw />
            <span>{isAr ? 'إعادة تعيين' : 'Reset'}</span>
          </button>
        </div>
      </div>

      {/* Results Info */}
      <div className="flex justify-between items-center text-sm text-gray-600">
        <div>
          {isAr ? (
            <>عرض {startItem} - {endItem} من {sortedData.length} نتيجة</>
          ) : (
            <>Showing {startItem} - {endItem} of {sortedData.length} results</>
          )}
        </div>
        {selectedRows.length > 0 && (
          <div className="text-dga-green font-semibold">
            {isAr ? `${selectedRows.length} محددة` : `${selectedRows.length} selected`}
          </div>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {/* Select All Checkbox */}
                <th className="px-4 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={selectedRows.length === paginatedData.length && paginatedData.length > 0}
                    onChange={toggleAllRows}
                    className="rounded border-gray-300 text-dga-green focus:ring-dga-green"
                  />
                </th>
                {columns.map((col) => (
                  <th
                    key={col.key}
                    className={`px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${
                      col.sortable !== false ? 'cursor-pointer hover:bg-gray-100' : ''
                    }`}
                    onClick={() => col.sortable !== false && handleSort(col.key)}
                  >
                    <div className="flex items-center gap-2">
                      <span>{col.label}</span>
                      {col.sortable !== false && sortConfig.key === col.key && (
                        sortConfig.direction === 'asc' ? (
                          <FiArrowUp className="text-dga-green" />
                        ) : (
                          <FiArrowDown className="text-dga-green" />
                        )
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {paginatedData.length === 0 ? (
                <tr>
                  <td colSpan={columns.length + 1} className="px-6 py-12 text-center text-gray-500">
                    {emptyMessage || (isAr ? 'لا توجد بيانات' : 'No data found')}
                  </td>
                </tr>
              ) : (
                paginatedData.map((item, index) => {
                  const globalIndex = (currentPage - 1) * pageSize + index
                  const isSelected = selectedRows.includes(globalIndex)
                  
                  return (
                    <tr
                      key={item.id || index}
                      className={`hover:bg-gray-50 transition-colors ${
                        isSelected ? 'bg-blue-50' : ''
                      } ${onRowClick ? 'cursor-pointer' : ''}`}
                      onClick={() => onRowClick && onRowClick(item)}
                    >
                      {/* Checkbox */}
                      <td className="px-4 py-4" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleRowSelection(item, index)}
                          className="rounded border-gray-300 text-dga-green focus:ring-dga-green"
                        />
                      </td>
                      {/* Data Cells */}
                      {columns.map((col) => (
                        <td key={col.key} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {col.render ? col.render(item[col.key], item) : (item[col.key] ?? '-')}
                        </td>
                      ))}
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="bg-gray-50 px-4 py-3 flex items-center justify-between border-t border-gray-200">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                className="p-2 rounded-lg border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
              >
                <FiChevronsLeft />
              </button>
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="p-2 rounded-lg border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
              >
                <FiChevronLeft />
              </button>
              <span className="px-4 text-sm text-gray-700">
                {isAr ? (
                  <>صفحة {currentPage} من {totalPages}</>
                ) : (
                  <>Page {currentPage} of {totalPages}</>
                )}
              </span>
              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="p-2 rounded-lg border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
              >
                <FiChevronRight />
              </button>
              <button
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
                className="p-2 rounded-lg border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
              >
                <FiChevronsRight />
              </button>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-700">{isAr ? 'عناصر لكل صفحة:' : 'Items per page:'}</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value))
                  setCurrentPage(1)
                }}
                className="px-3 py-1 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-dga-green"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default DataTable

