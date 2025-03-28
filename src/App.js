import React from "react";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import SellersPage from "./pages/SellersPage";
import BuyersPage from "./pages/BuyersPage";
import ComingSoonPage from "./pages/ComingSoonPage";
import BuyersNav from "./components/common/BuyerNav";
import SellersNav from "./components/common/SellerNav";
import BuyerFooter from "./components/common/BuyerFooter";

function App() {
  return (
    <Router>
      <Routes>
        <Route
          path="/"
          element={
            <>
              <SellersNav />
              <SellersPage />
            </>
          }
        />
        <Route
          path="/investordeals"
          element={
            <>
              <BuyersNav />
              <BuyersPage />
            </>
          }
        />
        <Route path="/*" element={<ComingSoonPage />} />
      </Routes>
      <BuyerFooter />
    </Router>
  );
}

export default App;
