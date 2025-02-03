import React from "react";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import SellersPage from "./pages/SellersPage";
import BuyersPage from "./pages/BuyersPage";
import ComingSoonPage from "./pages/ComingSoonPage"; // New page
import BuyersNav from "./components/common/BuyerNav";
import BuyerFooter from "./components/common/BuyerFooter";

function App() {
  return (
    <Router>
      <BuyersNav />
      <Routes>
        <Route path="/" element={<ComingSoonPage />} /> {/* Landing Page */}
        <Route path="/investordeals" element={<BuyersPage />} />
      </Routes>
      <BuyerFooter />
    </Router>
  );
}

export default App;
