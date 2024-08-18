import React from "react";
import "../../styles/components/sellers/HeroSection.css";

const HeroSection = ({ title, subtitle }) => {
  // Split subtitle by line breaks and map over the lines
  const lines = subtitle.split("\n");

  return (
    <section className="hero">
      <div className="hero-content">
        <h1 className="title">{title}</h1>
        {lines.map((line, index) => (
          <p key={index} className="subtitle-line">
            {/* Conditionally render text with bold styling */}
            {line.includes("Hendrix Ventures Group, LLC") ? (
              <>
                {line.split("Hendrix Ventures Group, LLC")[0]}
                <strong>Hendrix Ventures Group, LLC</strong>
                {line.split("Hendrix Ventures Group, LLC")[1]}
              </>
            ) : (
              line
            )}
          </p>
        ))}
      </div>
    </section>
  );
};

export default HeroSection;
