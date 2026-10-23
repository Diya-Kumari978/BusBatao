"use client";

import { useEffect, useState } from "react";
import { Brand } from "@/components/brand";

export function Splash() {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const key = "busbatao-welcomed-v1";
    if (!localStorage.getItem(key)) setVisible(true);
  }, []);

  function dismiss() {
    localStorage.setItem("busbatao-welcomed-v1", "1");
    setVisible(false);
  }

  if (!visible) return null;
  return <div className="splash-backdrop" role="dialog" aria-modal="true" aria-labelledby="splash-title">
    <div className="splash-content">
      <div className="splash-logo"><Brand /></div>
      <h1 id="splash-title">Know The Crowd Before You Board</h1>
      <p>Passenger observations for Hyderabad and Jamshoro.</p>
      <button className="button" type="button" onClick={dismiss}>Get Started <span aria-hidden="true">→</span></button>
    </div>
  </div>;
}
