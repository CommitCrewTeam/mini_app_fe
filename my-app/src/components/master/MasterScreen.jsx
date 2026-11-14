import { useState } from 'react'
import PlaceOrderScreen from '../place-order/PlaceOrderScreen'
import './MasterScreen.css'

function MasterScreen() {
  const [activeModule, setActiveModule] = useState(null)

  const modules = [
    { key: 'place-order', label: 'Đặt hàng ngay' },
  ]

  const renderContent = () => {
    if (activeModule === 'place-order') {
      return <PlaceOrderScreen />
    }
    return <div className="master-welcome">shop-pe</div>
  }

  return (
    <div className="master-layout">
      <aside className="master-sidebar">
        <div className="master-shop">shop-pe</div>
        <nav className="master-nav">
          {modules.map((module) => (
            <button
              key={module.key}
              type="button"
              className={`master-nav-item ${
                activeModule === module.key ? 'active' : ''
              }`}
              onClick={() => setActiveModule(module.key)}
            >
              {module.label}
            </button>
          ))}
        </nav>
      </aside>
      <main className="master-content">{renderContent()}</main>
    </div>
  )
}

export default MasterScreen