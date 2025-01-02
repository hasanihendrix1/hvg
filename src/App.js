import React from "react";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import SellersPage from "./pages/SellersPage";
import BuyersPage from "./pages/BuyersPage";
import Navbar from "./components/common/NavBar";
import BuyersNav from "./components/common/BuyerNav";
import BuyerFooter from "./components/common/BuyerFooter";

function App() {
  return (
    <Router>
      <BuyersNav />
      <Routes>
        <Route path="/sellers" element={<SellersPage />} />
        <Route path="/buyers" element={<BuyersPage />} />
        <Route path="/" element={<BuyersPage />} />
      </Routes>
      <BuyerFooter />
    </Router>
  );
}

export default App;
