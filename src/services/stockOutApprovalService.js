// TODO: Replace mock service with T143 API after merge.

const mockPendingExports = [
  {
    id: 'exp-1001',
    code: 'PX-2026-0001',
    createdByName: 'Nguyễn Văn An',
    warehouseName: 'Kho Hà Nội',
    submittedAt: '2026-07-10T08:30:00',
    status: 'CHO_DUYET',
    approvalLevel: 'CAP_1',
    approvalLevelLabel: 'Cấp 1',
  },
  {
    id: 'exp-1002',
    code: 'PX-2026-0002',
    createdByName: 'Trần Thị Bình',
    warehouseName: 'Kho Đà Nẵng',
    submittedAt: '2026-07-10T09:15:00',
    status: 'CHO_DUYET',
    approvalLevel: 'CAP_2',
    approvalLevelLabel: 'Cấp 2',
  },
  {
    id: 'exp-1003',
    code: 'PX-2026-0003',
    createdByName: 'Lê Minh Cường',
    warehouseName: 'Kho Hồ Chí Minh',
    submittedAt: '2026-07-10T10:45:00',
    status: 'CHO_DUYET',
    approvalLevel: 'CAP_1',
    approvalLevelLabel: 'Cấp 1',
  },
  {
    id: 'exp-1004',
    code: 'PX-2026-0004',
    createdByName: 'Phạm Huyền Trang',
    warehouseName: 'Kho Hải Phòng',
    submittedAt: '2026-07-10T11:20:00',
    status: 'CHO_DUYET',
    approvalLevel: 'CAP_2',
    approvalLevelLabel: 'Cấp 2',
  },
  {
    id: 'exp-1005',
    code: 'PX-2026-0005',
    createdByName: 'Đỗ Quang Minh',
    warehouseName: 'Kho Cần Thơ',
    submittedAt: '2026-07-10T13:10:00',
    status: 'CHO_DUYET',
    approvalLevel: 'CAP_1',
    approvalLevelLabel: 'Cấp 1',
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
