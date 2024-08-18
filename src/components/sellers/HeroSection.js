import React, { useEffect, useState } from "react";
import "../../styles/components/sellers/HeroSection.css";

const HeroSection = ({ title, subtitle }) => {
  const [animateUnderline, setAnimateUnderline] = useState(false);

  useEffect(() => {
    setTimeout(() => {
      setAnimateUnderline(true);
    }, 500); // Delay to make animation noticeable
  }, []);

  const lines = subtitle.split("\n");

  return (
    <section className="hero">
      <div className="hero-content">
        <h1 className="title">
          {title.split(" ").map((word, index) =>
            word === "FAST!" ? (
              <span
                key={index}
                className={`underline-animation ${
                  animateUnderline ? "underline-animate" : ""
                }`}
              >
                {word}
              </span>
            ) : (
              `${word} `
            )
          )}
        </h1>
        {lines.map((line, index) => (
          <p key={index} className="subtitle-line">
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
