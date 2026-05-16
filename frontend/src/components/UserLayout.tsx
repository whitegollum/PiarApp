import { Outlet } from 'react-router-dom'
import Navbar from './Navbar'
import UserSidebar from './UserSidebar'
import '../styles/UserLayout.css'

export default function UserLayout() {
  return (
    <div className="user-layout">
      <Navbar />
      <div className="user-layout-body">
        <UserSidebar />
        <main className="user-layout-content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
