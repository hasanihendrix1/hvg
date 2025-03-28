import React from "react";
import "../../../styles/components/sellers/sections/SellingProcess.css";

const SellingProcess = () => {
  const steps = [
    {
      title: "Get In Touch",
      description:
        "Fill out a your details and we’ll contact you promptly to gain a deeper understanding of your home and its condition.",
      icon: "🔍",
    },
    {
      title: "Receive Our Offer",
      description:
        "Once we’ve assessed your home, we’ll present you with a same-day offer! Feel free to accept or decline with no obligations whatsoever.",
      icon: "📩",
    },
    {
      title: "Sign & Get Paid",
      description:
        "When you accept our offer and the contract is signed & returned, we’ll work with the title company to set a closing date, and get you paid!",
      icon: "📝",
    },
  ];

  return (
    <section className="selling-process">
      <h2>How It Works</h2>
      <div className="steps-container">
        {steps.map((step, index) => (
          <div key={index} className="step">
            <div className="step-icon">{step.icon}</div>
            <h3>{`${index + 1}. ${step.title}`}</h3>
            <p>{step.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
};

export default SellingProcess;
