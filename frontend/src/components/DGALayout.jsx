import { Outlet } from 'react-router-dom';
import DGASidebar from './DGASidebar';
import Header from './Header';

function DGALayout() {
  return (
    <div className="flex h-screen bg-gray-50">
      <DGASidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto bg-gray-50">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default DGALayout;

