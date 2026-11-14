import { useState } from 'react'
import './PlaceOrderScreen.css'

function PlaceOrderScreen() {
  const [customerId, setCustomerId] = useState('c-1')
  const [items, setItems] = useState([{ productId: '1', quantity: 1, unitPrice: 30000000 }])
  const [preview, setPreview] = useState(null)
  const [error, setError] = useState(null)

  const handleItemChange = (index, field, value) => {
    const updated = items.map((item, i) =>
      i === index ? { ...item, [field]: value } : item,
    )
    setItems(updated)
  }

  const addItem = () => {
    setItems([...items, { productId: '', quantity: 1, unitPrice: 0 }])
  }

  const removeItem = (index) => {
    setItems(items.filter((_, i) => i !== index))
  }

  const handlePreview = async () => {
    setError(null)
    setPreview(null)
    try {
      const response = await fetch('http://localhost:8083/api/orders/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerId, shippingFee: 0, items }),
      })
      const payload = await response.json()
      if (!response.ok || !payload.success) {
        setError(payload.message || 'Lỗi preview đơn hàng')
        return
      }
      setPreview(payload.data)
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div className="place-order">
      <h2 className="place-order-title">Đặt hàng ngay</h2>

      <label className="place-order-field">
        Mã khách hàng
        <input
          type="text"
          value={customerId}
          onChange={(event) => setCustomerId(event.target.value)}
        />
      </label>

      <h3>Sản phẩm</h3>
      {items.map((item, index) => (
        <div className="place-order-item" key={index}>
          <input
            placeholder="Mã sản phẩm"
            value={item.productId}
            onChange={(event) => handleItemChange(index, 'productId', event.target.value)}
          />
          <input
            type="number"
            min="1"
            placeholder="Số lượng"
            value={item.quantity}
            onChange={(event) => handleItemChange(index, 'quantity', event.target.value)}
          />
          <input
            type="number"
            min="0"
            placeholder="Đơn giá"
            value={item.unitPrice}
            onChange={(event) => handleItemChange(index, 'unitPrice', event.target.value)}
          />
          <button type="button" onClick={() => removeItem(index)}>
            Xoá
          </button>
        </div>
      ))}
      <button type="button" className="place-order-add" onClick={addItem}>
        Thêm sản phẩm
      </button>

      <button type="button" className="place-order-preview" onClick={handlePreview}>
        Preview đơn hàng
      </button>

      {error && <p className="place-order-error">{error}</p>}

      {preview && (
        <div className="place-order-preview-result">
          <h3>Kết quả preview</h3>
          <table>
            <thead>
              <tr>
                <th>Sản phẩm</th>
                <th>Tên</th>
                <th>Số lượng</th>
                <th>Đơn giá</th>
                <th>Kho</th>
                <th>Available</th>
              </tr>
            </thead>
            <tbody>
              {preview.items.map((item) => (
                <tr key={item.productId}>
                  <td>{item.productId}</td>
                  <td>{item.name}</td>
                  <td>{item.quantity}</td>
                  <td>{item.unitPrice}</td>
                  <td>{item.stock}</td>
                  <td>{item.available ? 'Có' : 'Không'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="place-order-total">
            Tổng tiền: {preview.totalAmount.toLocaleString('vi-VN')} VND
          </p>
        </div>
      )}
    </div>
  )
}

export default PlaceOrderScreen