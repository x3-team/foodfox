"use client";

import { useEffect, useState } from "react";

export function CookieBar() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    setOpen(localStorage.getItem("fox-cookie") !== "ok");
  }, []);
  if (!open) return null;
  return (
    <div className="cookie" role="dialog" aria-label="Cookie">
      <p style={{ margin: 0 }}>Мы используем необходимые cookie. Аналитику можно не включать.</p>
      <button
        className="btn btn-dark"
        onClick={() => {
          localStorage.setItem("fox-cookie", "ok");
          setOpen(false);
        }}
      >
        Понятно
      </button>
    </div>
  );
}
