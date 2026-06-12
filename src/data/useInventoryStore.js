import { defineStore } from 'pinia'
import { getCurrentRoleLabel } from '../services/authService'

const now = '30/05/2026'

export const roles = ['Admin / IT', 'Quản lý kho', 'Nhân viên kho']
export const documentStatuses = ['Nháp', 'Chờ duyệt', 'Đã duyệt', 'Từ chối', 'Hoàn thành', 'Đã hủy']
export const warehouses = ['Kho trung tâm', 'Kho bán lẻ', 'Kho nguyên liệu']

export const useInventoryStore = defineStore('inventory', {
  state: () => ({
    currentRole: getCurrentRoleLabel(),
    users: [
      { id: 'NV001', name: 'Nguyễn Minh An', email: 'an.nguyen@stocksense.vn', phone: '0901 234 567', role: 'Admin / IT', status: 'Đang hoạt động', createdAt: '12/04/2026', note: 'Phụ trách hệ thống' },
      { id: 'NV002', name: 'Trần Thu Hà', email: 'ha.tran@stocksense.vn', phone: '0902 555 888', role: 'Quản lý kho', status: 'Đang hoạt động', createdAt: '15/04/2026', note: 'Duyệt phiếu kho' },
      { id: 'NV003', name: 'Lê Quốc Bảo', email: 'bao.le@stocksense.vn', phone: '0903 111 222', role: 'Nhân viên kho', status: 'Đang hoạt động', createdAt: '21/04/2026', note: 'Ca sáng' },
      { id: 'NV004', name: 'Phạm Thùy Linh', email: 'linh.pham@stocksense.vn', phone: '0904 333 444', role: 'Nhân viên kho', status: 'Tạm khóa', createdAt: '03/05/2026', note: 'Tạm nghỉ' },
    ],
    products: [
      { sku: 'SKU-001', name: 'Cà phê rang xay 500g', unit: 'Gói', category: 'Thực phẩm', min: 120, price: 68000, status: 'Đang bán' },
      { sku: 'SKU-002', name: 'Trà ô long hộp 20 gói', unit: 'Hộp', category: 'Thực phẩm', min: 80, price: 45000, status: 'Đang bán' },
      { sku: 'SKU-003', name: 'Ly giấy 12oz', unit: 'Thùng', category: 'Vật tư', min: 35, price: 210000, status: 'Đang bán' },
      { sku: 'SKU-004', name: 'Túi giấy SME size M', unit: 'Tập', category: 'Vật tư', min: 50, price: 56000, status: 'Tạm ngưng' },
    ],
    warehouseList: [
      { code: 'KHO-01', name: 'Kho trung tâm', address: 'Quận Bình Thạnh, TP.HCM', manager: 'Trần Thu Hà', status: 'Đang hoạt động' },
      { code: 'KHO-02', name: 'Kho bán lẻ', address: 'Quận 3, TP.HCM', manager: 'Lê Quốc Bảo', status: 'Đang hoạt động' },
      { code: 'KHO-03', name: 'Kho nguyên liệu', address: 'KCN Tân Bình, TP.HCM', manager: 'Trần Thu Hà', status: 'Đang hoạt động' },
    ],
    inventory: [
      { sku: 'SKU-001', product: 'Cà phê rang xay 500g', warehouse: 'Kho trung tâm', current: 96, min: 120, unit: 'Gói', status: 'Sắp hết', updatedAt: '30/05/2026 08:20' },
      { sku: 'SKU-002', product: 'Trà ô long hộp 20 gói', warehouse: 'Kho trung tâm', current: 210, min: 80, unit: 'Hộp', status: 'Đủ hàng', updatedAt: '29/05/2026 16:05' },
      { sku: 'SKU-003', product: 'Ly giấy 12oz', warehouse: 'Kho bán lẻ', current: 31, min: 35, unit: 'Thùng', status: 'Sắp hết', updatedAt: '30/05/2026 09:10' },
      { sku: 'SKU-004', product: 'Túi giấy SME size M', warehouse: 'Kho nguyên liệu', current: 12, min: 50, unit: 'Tập', status: 'Thiếu hàng', updatedAt: '28/05/2026 11:45' },
    ],
    transactions: [
      { id: 'GD-0001', date: '30/05/2026 09:20', product: 'Cà phê rang xay 500g', warehouse: 'Kho trung tâm', type: 'Nhập kho', quantity: '+40 Gói', actor: 'Lê Quốc Bảo', documentId: 'PNK-0003', note: 'Nhập bổ sung từ nhà cung cấp' },
      { id: 'GD-0002', date: '29/05/2026 14:00', product: 'Ly giấy 12oz', warehouse: 'Kho bán lẻ', type: 'Xuất kho', quantity: '-18 Thùng', actor: 'Lê Quốc Bảo', documentId: 'PXK-0002', note: 'Xuất cho cửa hàng Quận 3' },
      { id: 'GD-0003', date: '28/05/2026 10:30', product: 'Túi giấy SME size M', warehouse: 'Kho nguyên liệu', type: 'Điều chỉnh', quantity: '-5 Tập', actor: 'Trần Thu Hà', documentId: 'DC-0001', note: 'Điều chỉnh sau kiểm kê' },
    ],
    documents: [
      {
        id: 'PNK-0001', type: 'Nhập kho', status: 'Nháp', warehouse: 'Kho trung tâm', partner: 'Công ty Gia Phát', creator: 'Lê Quốc Bảo', createdAt: '30/05/2026', submittedAt: '', approver: '', approvedAt: '', note: 'Nhập hàng đầu tháng', rejectionReason: '',
        items: [{ sku: 'SKU-001', name: 'Cà phê rang xay 500g', unit: 'Gói', qty: 60, price: 68000 }],
        history: [{ time: '30/05/2026 08:10', actor: 'Lê Quốc Bảo', action: 'Tạo phiếu nháp' }],
      },
      {
        id: 'PNK-0002', type: 'Nhập kho', status: 'Chờ duyệt', warehouse: 'Kho nguyên liệu', partner: 'Nhà cung cấp An Việt', creator: 'Phạm Thùy Linh', createdAt: '29/05/2026', submittedAt: '29/05/2026 15:20', approver: '', approvedAt: '', note: 'Nhập vật tư đóng gói', rejectionReason: '',
        items: [{ sku: 'SKU-004', name: 'Túi giấy SME size M', unit: 'Tập', qty: 80, price: 56000 }],
        history: [{ time: '29/05/2026 15:00', actor: 'Phạm Thùy Linh', action: 'Tạo phiếu nháp' }, { time: '29/05/2026 15:20', actor: 'Phạm Thùy Linh', action: 'Gửi duyệt' }],
      },
      {
        id: 'PNK-0003', type: 'Nhập kho', status: 'Hoàn thành', warehouse: 'Kho trung tâm', partner: 'Công ty Gia Phát', creator: 'Lê Quốc Bảo', createdAt: '28/05/2026', submittedAt: '28/05/2026 11:30', approver: 'Trần Thu Hà', approvedAt: '28/05/2026 13:00', note: 'Đã nhập đủ', rejectionReason: '',
        items: [{ sku: 'SKU-001', name: 'Cà phê rang xay 500g', unit: 'Gói', qty: 40, price: 68000 }],
        history: [{ time: '28/05/2026 11:30', actor: 'Lê Quốc Bảo', action: 'Gửi duyệt' }, { time: '28/05/2026 13:00', actor: 'Trần Thu Hà', action: 'Duyệt và hoàn thành' }],
      },
      {
        id: 'PNK-0004', type: 'Nhập kho', status: 'Nháp', warehouse: 'Kho bán lẻ', partner: 'Công ty Minh Long', creator: 'Lê Quốc Bảo', createdAt: '30/05/2026', submittedAt: '', approver: '', approvedAt: '', note: 'Nhập ly giấy bổ sung', rejectionReason: '',
        items: [{ sku: 'SKU-003', name: 'Ly giấy 12oz', unit: 'Thùng', qty: 25, price: 210000 }],
        history: [{ time: '30/05/2026 08:35', actor: 'Lê Quốc Bảo', action: 'Tạo phiếu nháp' }],
      },
      {
        id: 'PNK-0005', type: 'Nhập kho', status: 'Chờ duyệt', warehouse: 'Kho trung tâm', partner: 'Nhà cung cấp An Việt', creator: 'Lê Quốc Bảo', createdAt: '30/05/2026', submittedAt: '30/05/2026 09:15', approver: '', approvedAt: '', note: 'Nhập trà ô long cho tuần mới', rejectionReason: '',
        items: [{ sku: 'SKU-002', name: 'Trà ô long hộp 20 gói', unit: 'Hộp', qty: 90, price: 45000 }],
        history: [{ time: '30/05/2026 09:00', actor: 'Lê Quốc Bảo', action: 'Tạo phiếu nháp' }, { time: '30/05/2026 09:15', actor: 'Lê Quốc Bảo', action: 'Gửi duyệt' }],
      },
      {
        id: 'PNK-0006', type: 'Nhập kho', status: 'Từ chối', warehouse: 'Kho nguyên liệu', partner: 'Công ty Bao Bì Xanh', creator: 'Phạm Thùy Linh', createdAt: '29/05/2026', submittedAt: '29/05/2026 16:10', approver: 'Trần Thu Hà', approvedAt: '', note: 'Nhập túi giấy', rejectionReason: 'Thiếu hóa đơn nhà cung cấp, cần bổ sung trước khi gửi lại.',
        items: [{ sku: 'SKU-004', name: 'Túi giấy SME size M', unit: 'Tập', qty: 120, price: 56000 }],
        history: [{ time: '29/05/2026 16:10', actor: 'Phạm Thùy Linh', action: 'Gửi duyệt' }, { time: '29/05/2026 16:40', actor: 'Trần Thu Hà', action: 'Từ chối phiếu' }],
      },
      {
        id: 'PNK-0007', type: 'Nhập kho', status: 'Đã hủy', warehouse: 'Kho trung tâm', partner: 'Công ty Gia Phát', creator: 'Lê Quốc Bảo', createdAt: '27/05/2026', submittedAt: '', approver: '', approvedAt: '', note: 'Hủy do tạo trùng phiếu', rejectionReason: '',
        items: [{ sku: 'SKU-001', name: 'Cà phê rang xay 500g', unit: 'Gói', qty: 30, price: 68000 }],
        history: [{ time: '27/05/2026 10:00', actor: 'Lê Quốc Bảo', action: 'Tạo phiếu nháp' }, { time: '27/05/2026 10:05', actor: 'Lê Quốc Bảo', action: 'Hủy phiếu' }],
      },
      {
        id: 'PXK-0001', type: 'Xuất kho', status: 'Từ chối', warehouse: 'Kho bán lẻ', partner: 'Cửa hàng Quận 3', creator: 'Lê Quốc Bảo', createdAt: '30/05/2026', submittedAt: '30/05/2026 10:10', approver: 'Trần Thu Hà', approvedAt: '', note: 'Xuất hàng bổ sung kệ', rejectionReason: 'Số lượng ly giấy vượt tồn khả dụng tại kho bán lẻ.',
        items: [{ sku: 'SKU-003', name: 'Ly giấy 12oz', unit: 'Thùng', qty: 40, price: 210000 }],
        history: [{ time: '30/05/2026 10:10', actor: 'Lê Quốc Bảo', action: 'Gửi duyệt' }, { time: '30/05/2026 10:25', actor: 'Trần Thu Hà', action: 'Từ chối phiếu' }],
      },
      {
        id: 'PXK-0002', type: 'Xuất kho', status: 'Chờ duyệt', warehouse: 'Kho trung tâm', partner: 'Cửa hàng Quận 7', creator: 'Lê Quốc Bảo', createdAt: '30/05/2026', submittedAt: '30/05/2026 09:50', approver: '', approvedAt: '', note: 'Xuất hàng bán lẻ', rejectionReason: '',
        items: [{ sku: 'SKU-002', name: 'Trà ô long hộp 20 gói', unit: 'Hộp', qty: 32, price: 45000 }],
        history: [{ time: '30/05/2026 09:50', actor: 'Lê Quốc Bảo', action: 'Gửi duyệt' }],
      },
      {
        id: 'PXK-0003', type: 'Xuất kho', status: 'Nháp', warehouse: 'Kho trung tâm', partner: 'Cửa hàng Quận 1', creator: 'Phạm Thùy Linh', createdAt: '30/05/2026', submittedAt: '', approver: '', approvedAt: '', note: 'Xuất hàng trưng bày', rejectionReason: '',
        items: [{ sku: 'SKU-001', name: 'Cà phê rang xay 500g', unit: 'Gói', qty: 18, price: 68000 }],
        history: [{ time: '30/05/2026 08:55', actor: 'Phạm Thùy Linh', action: 'Tạo phiếu nháp' }],
      },
      {
        id: 'PXK-0004', type: 'Xuất kho', status: 'Chờ duyệt', warehouse: 'Kho bán lẻ', partner: 'Cửa hàng Quận 5', creator: 'Lê Quốc Bảo', createdAt: '30/05/2026', submittedAt: '30/05/2026 10:35', approver: '', approvedAt: '', note: 'Xuất ly giấy cho chi nhánh', rejectionReason: '',
        items: [{ sku: 'SKU-003', name: 'Ly giấy 12oz', unit: 'Thùng', qty: 10, price: 210000 }],
        history: [{ time: '30/05/2026 10:35', actor: 'Lê Quốc Bảo', action: 'Gửi duyệt' }],
      },
      {
        id: 'PXK-0005', type: 'Xuất kho', status: 'Hoàn thành', warehouse: 'Kho trung tâm', partner: 'Cửa hàng Quận 10', creator: 'Lê Quốc Bảo', createdAt: '28/05/2026', submittedAt: '28/05/2026 14:10', approver: 'Trần Thu Hà', approvedAt: '28/05/2026 14:40', note: 'Đã xuất đủ', rejectionReason: '',
        items: [{ sku: 'SKU-002', name: 'Trà ô long hộp 20 gói', unit: 'Hộp', qty: 24, price: 45000 }],
        history: [{ time: '28/05/2026 14:10', actor: 'Lê Quốc Bảo', action: 'Gửi duyệt' }, { time: '28/05/2026 14:40', actor: 'Trần Thu Hà', action: 'Duyệt và hoàn thành' }],
      },
      {
        id: 'PXK-0006', type: 'Xuất kho', status: 'Từ chối', warehouse: 'Kho nguyên liệu', partner: 'Bộ phận đóng gói', creator: 'Phạm Thùy Linh', createdAt: '29/05/2026', submittedAt: '29/05/2026 11:30', approver: 'Trần Thu Hà', approvedAt: '', note: 'Xuất túi giấy cho đóng gói', rejectionReason: 'Cần giảm số lượng xuất vì tồn kho dưới ngưỡng tối thiểu.',
        items: [{ sku: 'SKU-004', name: 'Túi giấy SME size M', unit: 'Tập', qty: 45, price: 56000 }],
        history: [{ time: '29/05/2026 11:30', actor: 'Phạm Thùy Linh', action: 'Gửi duyệt' }, { time: '29/05/2026 11:55', actor: 'Trần Thu Hà', action: 'Từ chối phiếu' }],
      },
    ],
    alerts: [
      { sku: 'SKU-001', product: 'Cà phê rang xay 500g', warehouse: 'Kho trung tâm', current: 96, min: 120, level: 'Trung bình', detectedAt: '30/05/2026', status: 'Chưa xử lý' },
      { sku: 'SKU-003', product: 'Ly giấy 12oz', warehouse: 'Kho bán lẻ', current: 31, min: 35, level: 'Cao', detectedAt: '30/05/2026', status: 'Đang xử lý' },
      { sku: 'SKU-004', product: 'Túi giấy SME size M', warehouse: 'Kho nguyên liệu', current: 12, min: 50, level: 'Khẩn cấp', detectedAt: '28/05/2026', status: 'Chưa xử lý' },
    ],
    importPreview: [
      { sku: 'SKU-005', product: 'Bình giữ nhiệt 500ml', unit: 'Cái', warehouse: 'Kho trung tâm', quantity: 120, min: 30 },
      { sku: 'SKU-006', product: 'Hộp giấy size L', unit: 'Thùng', warehouse: 'Kho nguyên liệu', quantity: 55, min: 20 },
    ],
    importErrors: [
      { row: 6, column: 'SKU', value: '', reason: 'SKU bắt buộc nhập', suggestion: 'Điền mã SKU theo file mẫu' },
      { row: 9, column: 'Số lượng', value: '-12', reason: 'Số lượng không được âm', suggestion: 'Nhập số nguyên lớn hơn hoặc bằng 0' },
    ],
  }),
  getters: {
    isAdmin: state => state.currentRole === 'Admin / IT',
    isManager: state => state.currentRole === 'Quản lý kho',
    isStaff: state => state.currentRole === 'Nhân viên kho',
    stockInDocuments: state => state.documents.filter(item => item.type === 'Nhập kho'),
    stockOutDocuments: state => state.documents.filter(item => item.type === 'Xuất kho'),
    pendingIn: state => state.documents.filter(item => item.type === 'Nhập kho' && item.status === 'Chờ duyệt'),
    pendingOut: state => state.documents.filter(item => item.type === 'Xuất kho' && item.status === 'Chờ duyệt'),
  },
  actions: {
    setRole(role) {
      this.currentRole = role
    },
    syncRoleFromAuth() {
      this.currentRole = getCurrentRoleLabel()
    },
    findDocument(id) {
      return this.documents.find(item => item.id === id)
    },
    submitDocument(id) {
      const doc = this.findDocument(id)
      if (!doc) return
      doc.status = 'Chờ duyệt'
      doc.submittedAt = `${now} 10:45`
      doc.history.push({ time: `${now} 10:45`, actor: doc.creator, action: doc.rejectionReason ? 'Gửi duyệt lại' : 'Gửi duyệt' })
    },
    submitDocuments(ids) {
      ids.forEach(id => this.submitDocument(id))
    },
    approveDocument(id) {
      const doc = this.findDocument(id)
      if (!doc) return
      doc.status = 'Hoàn thành'
      doc.approver = 'Trần Thu Hà'
      doc.approvedAt = `${now} 11:00`
      doc.rejectionReason = ''
      doc.history.push({ time: `${now} 11:00`, actor: 'Trần Thu Hà', action: 'Duyệt và hoàn thành' })
      doc.items.forEach(item => {
        this.transactions.unshift({
          id: `GD-${String(this.transactions.length + 1).padStart(4, '0')}`,
          date: `${now} 11:00`,
          product: item.name,
          warehouse: doc.warehouse,
          type: doc.type,
          quantity: `${doc.type === 'Nhập kho' ? '+' : '-'}${item.qty} ${item.unit}`,
          actor: 'Trần Thu Hà',
          documentId: doc.id,
          note: `Tự động ghi nhận từ ${doc.id}`,
        })
      })
    },
    rejectDocument(id, reason) {
      const doc = this.findDocument(id)
      if (!doc || !reason) return
      doc.status = 'Từ chối'
      doc.approver = 'Trần Thu Hà'
      doc.rejectionReason = reason
      doc.history.push({ time: `${now} 11:05`, actor: 'Trần Thu Hà', action: `Từ chối: ${reason}` })
    },
    cancelDocument(id) {
      const doc = this.findDocument(id)
      if (!doc) return
      doc.status = 'Đã hủy'
      doc.history.push({ time: `${now} 11:10`, actor: doc.creator, action: 'Hủy phiếu' })
    },
    saveUser(user) {
      if (user.id) {
        const index = this.users.findIndex(item => item.id === user.id)
        if (index >= 0) this.users[index] = { ...this.users[index], ...user }
        return
      }
      this.users.unshift({ ...user, id: `NV${String(this.users.length + 1).padStart(3, '0')}`, createdAt: now })
    },
  },
})
