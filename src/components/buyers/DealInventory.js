import React, { useState, useEffect } from "react";
import DealCard from "./DealCard";
import "../../styles/components/buyers/DealInventory.css";

// Custom hook to get current window width
const useWindowWidth = () => {
  const [width, setWidth] = useState(window.innerWidth);
  useEffect(() => {
    const handleResize = () => setWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);
  return width;
};

const convertToDate = (timestamp) => {
  const [year, quarter] = timestamp.split("-Q");
  const month = (parseInt(quarter) - 1) * 3;
  return new Date(`${year}-${String(month + 1).padStart(2, "0")}-01`);
};

const DealInventory = ({ filterStatus }) => {
  const [deals, setDeals] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const windowWidth = useWindowWidth();

  // Set dealsPerPage based on screen width: 6 for screens >= 1440px, otherwise 4
  const dealsPerPage = windowWidth >= 1440 ? 6 : 4;

  useEffect(() => {
    const fetchDeals = async () => {
      try {
        const response = await fetch("/.netlify/functions/getDeals", {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        });
        if (!response.ok) {
          throw new Error(`Error fetching deals: ${response.statusText}`);
        }
        const data = await response.json();
        const sortedDeals = data.sort(
          (a, b) => convertToDate(b.timestamp) - convertToDate(a.timestamp)
        );
        setDeals(sortedDeals);
      } catch (error) {
        console.error("Error fetching deals:", error);
      }
    };
    fetchDeals();
  }, []);

  const filteredDeals = filterStatus
    ? deals.filter(
        (deal) => deal.status.toLowerCase() === filterStatus.toLowerCase()
      )
    : deals;

  const indexOfLastDeal = currentPage * dealsPerPage;
  const indexOfFirstDeal = indexOfLastDeal - dealsPerPage;
  const currentDeals = filteredDeals.slice(indexOfFirstDeal, indexOfLastDeal);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  return (
    <section className="deal-inventory">
      {filteredDeals.length === 0 ? (
        <div className="no-deals-message">
          <p>No results for the selected status.</p>
        </div>
      ) : (
        <>
          <div className="deal-grid">
            {currentDeals.map((deal) => (
              <DealCard key={deal._id} deal={deal} />
            ))}
          </div>
          <div className="pagination">
            {Array.from(
              { length: Math.ceil(filteredDeals.length / dealsPerPage) },
              (_, i) => (
                <button
                  key={i + 1}
                  onClick={() => paginate(i + 1)}
                  className={currentPage === i + 1 ? "active" : ""}
                >
                  {i + 1}
                </button>
              )
            )}
          </div>
        </>
      )}
    </section>
  );
};

export default DealInventory;
