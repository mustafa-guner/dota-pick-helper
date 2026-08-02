import { Route, Routes } from 'react-router-dom';
import HeroListPage from './pages/HeroListPage';
import HeroDetailPage from './pages/HeroDetailPage';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HeroListPage />} />
      <Route path="/heroes/:id" element={<HeroDetailPage />} />
    </Routes>
  );
}
