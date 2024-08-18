import React from "react";
import "../../../styles/components/sellers/sections/FeaturedTestimonial.css";
import sellerImage from "../../../assets/logos/seller_closing.jpg";

const FeaturedTestimonial = ({ backgroundColor = "#fff" }) => {
  return (
    <section
      className="testimonial-section"
      style={{ backgroundColor: backgroundColor }}
    >
      <h2 className="testimonial-headline">
        Real Sellers. Real Stories. Real Results.
      </h2>
      <div className="testimonial-content">
        <img src={sellerImage} alt="Seller" className="seller-image" />
        <blockquote className="testimonial-quote">
          "Very quick, very easy... we closed in 4 days. I spoke with you on
          Monday and here we are on Thursday."
        </blockquote>
        <div className="testimonial-note">
          <em>
            – Helped homeowner avoid <strong>foreclosure</strong> with just days
            to spare before deadline.
          </em>
        </div>
      </div>

      <div className="additional-videos">
        <div className="video-container">
          <iframe
            src="https://www.youtube.com/embed/gmGcCpwWiMU"
            title="Testimonial Video 1"
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          ></iframe>
        </div>
        <div className="video-container">
          <iframe
            src="https://www.youtube.com/embed/58MALezZXpQ"
            title="Testimonial Video 2"
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          ></iframe>
        </div>
        <div className="video-container">
          <iframe
            src="https://www.youtube.com/embed/3qn9_7rSgAg"
            title="Testimonial Video 3"
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          ></iframe>
        </div>
      </div>
    </section>
  );
};

export default FeaturedTestimonial;
