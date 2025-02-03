import React, { useEffect, useState } from "react";
import "../../../styles/components/sellers/sections/HeroSection.css";

const HeroSection = ({ title, subtitle }) => {
  const [animateUnderline, setAnimateUnderline] = useState(false);

  useEffect(() => {
    setTimeout(() => {
      setAnimateUnderline(true);
    }, 500); // Delay to make animation noticeable
  }, []);

  const renderTitle = (title) => {
    return title.split(" ").map((word, index) =>
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
    );
  };

  const lines = subtitle.split("\n");

  return (
    <section className="hero">
      <div className="hero-content">
        <h1 className="title">{renderTitle(title)}</h1>
        {lines.map((line, index) => {
          if (line.includes("Hendrix Ventures Group, LLC")) {
            const [before, after] = line.split("Hendrix Ventures Group, LLC");
            return (
              <p key={index} className="subtitle-line">
                {before}
                <strong>Hendrix Ventures Group, LLC</strong>
                {after}
              </p>
            );
          } else {
            return (
              <p key={index} className="subtitle-line">
                {line}
              </p>
            );
          }
        })}
      </div>
    </section>
  );
};

export default HeroSection;
