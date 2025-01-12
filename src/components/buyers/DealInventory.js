import React, { useState } from "react";
import DealCard from "./DealCard";
import "../../styles/components/buyers/DealInventory.css";

const DealInventory = () => {
  // Placeholder data
  const deals = [
    {
      id: 1,
      title: "3-Bedroom Fixer Upper",
      price: "$150,000",
      status: "Available",
      address: "123 Main St, Atlanta, GA",
      bedrooms: 3,
      bathrooms: 2,
      sqft: 1200,
      image:
        "https://images.unsplash.com/photo-1560185127-6db1736f0b65?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=MnwzNjUyOXwwfDF8c2VhcmNofDEwfHxob3VzZXxlbnwwfHx8fDE2NzI4MzU0MzM&ixlib=rb-1.2.1&q=80&w=400",
    },
    {
      id: 2,
      title: "Spacious Family Home",
      price: "$180,000",
      status: "Pending",
      address: "456 Elm St, Decatur, GA",
      bedrooms: 4,
      bathrooms: 3,
      sqft: 2000,
      image:
        "https://images.unsplash.com/photo-1580603645862-df0a53e201f2?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=MnwzNjUyOXwwfDF8c2VhcmNofDR8fGhvbWV8ZW58MHx8fHwxNjcyODM1NDYx&ixlib=rb-1.2.1&q=80&w=400",
    },
    {
      id: 3,
      title: "Luxury Duplex",
      price: "$200,000",
      status: "Assigned",
      address: "789 Pine St, Stone Mountain, GA",
      bedrooms: 5,
      bathrooms: 4,
      sqft: 2500,
      image:
        "https://images.unsplash.com/photo-1560184897-c31d45cb68f9?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=MnwzNjUyOXwwfDF8c2VhcmNofDF8fGhvbWV8ZW58MHx8fHwxNjcyODM1NDYx&ixlib=rb-1.2.1&q=80&w=400",
    },
    {
      id: 4,
      title: "Investment Condo",
      price: "$125,000",
      status: "Available",
      address: "321 Oak Ave, Atlanta, GA",
      bedrooms: 2,
      bathrooms: 2,
      sqft: 900,
      image:
        "https://images.unsplash.com/photo-1599423300746-b62533397364?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=MnwzNjUyOXwwfDF8c2VhcmNofDJ8fGhvYmF8ZW58MHx8fHwxNjcyODM1NDYx&ixlib=rb-1.2.1&q=80&w=400",
    },
    {
      id: 5,
      title: "Modern Townhouse",
      price: "$300,000",
      status: "Sold",
      address: "654 Maple Rd, Sandy Springs, GA",
      bedrooms: 4,
      bathrooms: 3,
      sqft: 1500,
      image:
        "https://images.unsplash.com/photo-1599602802205-94d0fbac501b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=MnwzNjUyOXwwfDF8c2VhcmNofDV8fGhvYmF8ZW58MHx8fHwxNjcyODM1NDYx&ixlib=rb-1.2.1&q=80&w=400",
    },
    {
      id: 6,
      title: "Charming Bungalow",
      price: "$175,000",
      status: "Available",
      address: "987 Cedar St, Marietta, GA",
      bedrooms: 3,
      bathrooms: 2,
      sqft: 1400,
      image:
        "https://images.unsplash.com/photo-1572120360610-d971b9b5f716?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=MnwzNjUyOXwwfDF8c2VhcmNofDl8fGhvYmV8ZW58MHx8fHwxNjcyODM1NDYx&ixlib=rb-1.2.1&q=80&w=400",
    },
    {
      id: 7,
      title: "Downtown Apartment",
      price: "$100,000",
      status: "Assigned",
      address: "123 River St, Atlanta, GA",
      bedrooms: 1,
      bathrooms: 1,
      sqft: 700,
      image:
        "https://images.unsplash.com/photo-1600585154340-be6161c458f2?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=MnwzNjUyOXwwfDF8c2VhcmNofDl8fGFwYXJ0bWVudHxlbnwwfHx8fDE2NzI4MzU0OTI&ixlib=rb-1.2.1&q=80&w=400",
    },
    {
      id: 8,
      title: "Suburban Retreat",
      price: "$250,000",
      status: "Sold",
      address: "444 Birch Rd, Kennesaw, GA",
      bedrooms: 4,
      bathrooms: 3,
      sqft: 1800,
      image:
        "https://images.unsplash.com/photo-1600585154357-77c19b10b3c7?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=MnwzNjUyOXwwfDF8c2VhcmNofDh8fGFwYXJ0bWVudHxlbnwwfHx8fDE2NzI4MzU0OTI&ixlib=rb-1.2.1&q=80&w=400",
    },
    {
      id: 9,
      title: "Family-Friendly Home",
      price: "$225,000",
      status: "Available",
      address: "888 Spruce Ln, Roswell, GA",
      bedrooms: 4,
      bathrooms: 3,
      sqft: 1900,
      image:
        "https://images.unsplash.com/photo-1587929651402-4a1db3a301d7?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=MnwzNjUyOXwwfDF8c2VhcmNofDd8fGhvYmV8ZW58MHx8fHwxNjcyODM1NDYx&ixlib=rb-1.2.1&q=80&w=400",
    },
    {
      id: 10,
      title: "Fix-and-Flip Opportunity",
      price: "$130,000",
      status: "Available",
      address: "101 Peach Ave, Atlanta, GA",
      bedrooms: 3,
      bathrooms: 2,
      sqft: 1000,
      image:
        "https://images.unsplash.com/photo-1580079826033-370d6b48ab4b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=MnwzNjUyOXwwfDF8c2VhcmNofDF8fGFwYXJ0bWVudHxlbnwwfHx8fDE2NzI4MzU1MDE&ixlib=rb-1.2.1&q=80&w=400",
    },
  ];

  const [currentPage, setCurrentPage] = useState(1);
  const dealsPerPage = 3;

  // Pagination logic
  const indexOfLastDeal = currentPage * dealsPerPage;
  const indexOfFirstDeal = indexOfLastDeal - dealsPerPage;
  const currentDeals = deals.slice(indexOfFirstDeal, indexOfLastDeal);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  return (
    <section className="deal-inventory">
      <div className="deal-grid">
        {currentDeals.map((deal) => (
          <DealCard key={deal.id} deal={deal} />
        ))}
      </div>
      <div className="pagination">
        {Array.from(
          { length: Math.ceil(deals.length / dealsPerPage) },
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
    </section>
  );
};

export default DealInventory;
