import React from "react";
import {
  BrowserRouter as Router,
  Route,
  Routes,
  Navigate,
} from "react-router-dom";
import SellersPage from "./pages/SellersPage";
import BuyersPage from "./pages/BuyersPage";
import BuyersNav from "./components/common/BuyerNav";
import BuyerFooter from "./components/common/BuyerFooter";

function App() {
  return (
    <Router>
      <BuyersNav />
      <Routes>
        <Route path="/investordeals" element={<BuyersPage />} />
      </Routes>
      <BuyerFooter />
    </Router>
  );
}

export default App;
