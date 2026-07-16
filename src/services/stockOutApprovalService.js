// TODO: Replace mock service with T144 API after merge.

const mockPendingExports = [
  {
    id: 'exp-1001',
    code: 'PX-2026-0001',
    createdByName: 'Nguyễn Văn An',
    warehouseName: 'Kho Hà Nội',
    createdAt: '2026-07-09T08:30:00',
    submittedAt: '2026-07-10T08:30:00',
    status: 'CHO_DUYET',
    approvalLevel: 'CAP_1',
    approvalLevelLabel: 'Cấp 1',
    items: [
      {
        productId: 'prod-1001',
        productCode: 'SP-001',
        productName: 'Sản phẩm A',
        unitName: 'hộp',
        exportQuantity: 10,
        currentStock: 6,
      },
      {
        productId: 'prod-1002',
        productCode: 'SP-002',
        productName: 'Sản phẩm B',
        unitName: 'thùng',
        exportQuantity: 4,
        currentStock: 8,
      },
    ],
  },
  {
    id: 'exp-1002',
    code: 'PX-2026-0002',
    createdByName: 'Trần Thị Bình',
    warehouseName: 'Kho Đà Nẵng',
    createdAt: '2026-07-09T09:15:00',
    submittedAt: '2026-07-10T09:15:00',
    status: 'CHO_DUYET',
    approvalLevel: 'CAP_2',
    approvalLevelLabel: 'Cấp 2',
    items: [
      {
        productId: 'prod-2001',
        productCode: 'SP-003',
        productName: 'Sản phẩm C',
        unitName: 'chiếc',
        exportQuantity: 3,
        currentStock: 5,
      },
      {
        productId: 'prod-2002',
        productCode: 'SP-004',
        productName: 'Sản phẩm D',
        unitName: 'cái',
        exportQuantity: 12,
        currentStock: 9,
      },
    ],
  },
  {
    id: 'exp-1003',
    code: 'PX-2026-0003',
    createdByName: 'Lê Minh Cường',
    warehouseName: 'Kho Hồ Chí Minh',
    createdAt: '2026-07-09T10:45:00',
    submittedAt: '2026-07-10T10:45:00',
    status: 'CHO_DUYET',
    approvalLevel: 'CAP_1',
    approvalLevelLabel: 'Cấp 1',
    items: [
      {
        productId: 'prod-3001',
        productCode: 'SP-005',
        productName: 'Sản phẩm E',
        unitName: 'hộp',
        exportQuantity: 7,
        currentStock: 7,
      },
      {
        productId: 'prod-3002',
        productCode: 'SP-006',
        productName: 'Sản phẩm F',
        unitName: 'thùng',
        exportQuantity: 2,
        currentStock: 3,
      },
    ],
  },
  {
    id: 'exp-1004',
    code: 'PX-2026-0004',
    createdByName: 'Phạm Huyền Trang',
    warehouseName: 'Kho Hải Phòng',
    createdAt: '2026-07-09T11:20:00',
    submittedAt: '2026-07-10T11:20:00',
    status: 'CHO_DUYET',
    approvalLevel: 'CAP_2',
    approvalLevelLabel: 'Cấp 2',
    items: [
      {
        productId: 'prod-4001',
        productCode: 'SP-007',
        productName: 'Sản phẩm G',
        unitName: 'cái',
        exportQuantity: 2,
        currentStock: 4,
      },
      {
        productId: 'prod-4002',
        productCode: 'SP-008',
        productName: 'Sản phẩm H',
        unitName: 'lốc',
        exportQuantity: 6,
        currentStock: 2,
      },
    ],
  },
  {
    id: 'exp-1005',
    code: 'PX-2026-0005',
    createdByName: 'Đỗ Quang Minh',
    warehouseName: 'Kho Cần Thơ',
    createdAt: '2026-07-09T13:10:00',
    submittedAt: '2026-07-10T13:10:00',
    status: 'CHO_DUYET',
    approvalLevel: 'CAP_1',
    approvalLevelLabel: 'Cấp 1',
    items: [
      {
        productId: 'prod-5001',
        productCode: 'SP-009',
        productName: 'Sản phẩm I',
        unitName: 'hộp',
        exportQuantity: 1,
        currentStock: 1,
      },
      {
        productId: 'prod-5002',
        productCode: 'SP-010',
        productName: 'Sản phẩm J',
        unitName: 'thùng',
        exportQuantity: 5,
        currentStock: 3,
      },
    ],
  },
]

function delay(ms = 300) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export async function getPendingExportApprovals({ page = 0, size = 10 } = {}) {
  await delay()

  const start = page * size
  const end = start + size
  const content = mockPendingExports.slice(start, end)

  return {
    content,
    totalElements: mockPendingExports.length,
    totalPages: Math.max(1, Math.ceil(mockPendingExports.length / size)),
    page,
    size,
  }
}

export async function getPendingExportApprovalDetail(id) {
  await delay(200)

  const detail = mockPendingExports.find(item => item.id === id)
  if (!detail) {
    throw new Error('Không tìm thấy phiếu xuất đang chờ duyệt.')
  }

  return detail
}
