import React from "react";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import SellersPage from "./pages/SellersPage";
import BuyersPage from "./pages/BuyersPage";
import Navbar from "./components/common/NavBar";
import Footer from "./components/common/Footer";

function App() {
  return (
    <Router>
      <Navbar />
      <Routes>
        <Route path="/sellers" element={<SellersPage />} />
        <Route path="/buyers" element={<BuyersPage />} />
        <Route path="/" element={<SellersPage />} />
      </Routes>
      <Footer />
    </Router>
  );
}

export default App;
