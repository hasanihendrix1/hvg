import React, { useState, useEffect } from "react";
import { createClient } from "@sanity/client";
import DealCard from "./DealCard";
import "../../styles/components/buyers/DealInventory.css";

const client = createClient({
  projectId: process.env.REACT_APP_SANITY_PROJECT_ID,
  dataset: process.env.REACT_APP_SANITY_DATASET,
  apiVersion: "2023-01-01", // Use the current date to ensure up-to-date API features
  useCdn: true, // Use the Sanity CDN for faster response times in production
});

const DealInventory = ({ filterStatus }) => {
  const [deals, setDeals] = useState([]); // Add deals state here
  const [currentPage, setCurrentPage] = useState(1);
  const dealsPerPage = 4;

  useEffect(() => {
    // Fetch data from Sanity
    const fetchDeals = async () => {
      try {
        const data = await client.fetch(
          `*[_type == "deal"]{
            _id,
            title,
            "price": price,
            status,
            address,
            bedrooms,
            bathrooms,
            sqft,
            "image": image.asset->url
          }`
        );
        setDeals(data); // Update the deals state with fetched data
      } catch (error) {
        console.error("Error fetching deals:", error);
      }
    };

    fetchDeals();
  }, []);

  // Filter deals based on the selected status
  const filteredDeals = filterStatus
    ? deals.filter(
        (deal) => deal.status.toLowerCase() === filterStatus.toLowerCase()
      )
    : deals;

  // Pagination logic
  const indexOfLastDeal = currentPage * dealsPerPage;
  const indexOfFirstDeal = indexOfLastDeal - dealsPerPage;
  const currentDeals = filteredDeals.slice(indexOfFirstDeal, indexOfLastDeal);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  return (
    <section className="deal-inventory">
      {filteredDeals.length === 0 ? ( // Show message if no deals match the filter
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
