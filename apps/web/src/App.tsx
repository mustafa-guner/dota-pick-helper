import { Route, Routes } from 'react-router-dom';
import HeroListPage from './pages/HeroListPage';
import HeroDetailPage from './pages/HeroDetailPage';
import Footer from './components/Footer';

export default function App() {
  return (
    <div className="flex min-h-screen flex-col">
      <div className="flex-1">
        <Routes>
          <Route path="/" element={<HeroListPage />} />
          <Route path="/heroes/:id" element={<HeroDetailPage />} />
        </Routes>
      </div>
      <Footer />
    </div>
  );
}
